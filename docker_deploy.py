# docker_deploy.py
# Usage examples:
#   python docker_deploy.py
#   python docker_deploy.py --version 1.0.1
#   python docker_deploy.py --service picai --project picai
#   python docker_deploy.py --keep-image
#   python docker_deploy.py --use-buildkit

from __future__ import annotations

import argparse
import os
import re
import shlex
import subprocess
from pathlib import Path


def _shlex_join(cmd: list[str]) -> str:
    # shlex.join exists in Python 3.8+; provide fallback for 3.7
    join = getattr(shlex, "join", None)
    if join is not None:
        return join(cmd)
    return " ".join(shlex.quote(c) for c in cmd)


def run(cmd: list[str], *, env: dict | None = None, check: bool = True) -> subprocess.CompletedProcess:
    print(f"\n$ {_shlex_join(cmd)}")
    cp = subprocess.run(
        cmd,
        text=True,
        capture_output=True,
        env=env,
        shell=False,
    )
    if cp.stdout:
        print(cp.stdout.rstrip())
    if cp.stderr:
        print(cp.stderr.rstrip())

    if check and cp.returncode != 0:
        raise SystemExit(f"command failed (exit={cp.returncode}): {_shlex_join(cmd)}")
    return cp


def sanitize_project_name(name: str) -> str:
    # docker compose does its own project name cleanup; approximate it here
    name = name.strip().lower()
    name = re.sub(r"[^a-z0-9._-]+", "", name)
    return name or "project"


def docker_container_exists(container_name: str) -> bool:
    cp = run(["docker", "ps", "-a", "--filter", f"name=^{container_name}$", "--format", "{{.ID}}"], check=False)
    return bool(cp.stdout.strip())


def docker_stop_rm_container(container_name: str):
    if docker_container_exists(container_name):
        run(["docker", "stop", container_name], check=False)
        run(["docker", "rm", container_name], check=False)
    else:
        print(f"\n[i] container not found, skip stop/rm: {container_name}")


def docker_image_ids_of(ref: str) -> list[str]:
    cp = run(["docker", "images", "-q", ref], check=False)
    ids = [x.strip() for x in cp.stdout.splitlines() if x.strip()]
    # de-dup while keeping order
    seen: set[str] = set()
    out: list[str] = []
    for i in ids:
        if i not in seen:
            seen.add(i)
            out.append(i)
    return out


def docker_remove_image_ref(ref: str):
    ids = docker_image_ids_of(ref)
    if not ids:
        print(f"\n[i] image not found, skip rmi: {ref}")
        return
    run(["docker", "rmi", "-f", ref], check=False)


def get_compose_service_image_ref(service: str | None, project: str | None) -> tuple[str, str]:
    """
    Return (service_name, compose_image_ref_with_latest_tag).
    Try to read docker compose services. If image is not specified,
    assume default "<project>-<service>:latest".
    """
    svc = service
    try:
        cp = run(["docker", "compose", "config", "--services"], check=True)
        services = [s.strip() for s in cp.stdout.splitlines() if s.strip()]
        if not services:
            raise RuntimeError("docker compose returned no services")
        if svc is None:
            svc = services[0]
        elif svc not in services:
            print(f"[!] service={svc} not in compose services={services}; using {services[0]}")
            svc = services[0]
    except Exception as exc:
        if svc is None:
            svc = "picai"
        print(f"[!] failed to read compose services ({exc}); fallback to service={svc}")

    if project:
        proj = sanitize_project_name(project)
    else:
        proj = sanitize_project_name(Path.cwd().name)

    image_name = None
    try:
        run(["docker", "compose", "config"], check=True)
        # Not parsing YAML; most projects rely on the default image name.
    except Exception:
        pass

    if not image_name:
        image_name = f"{proj}-{svc}"

    return svc, f"{image_name}:latest"


def find_image_id_by_ref(ref: str) -> str | None:
    ids = docker_image_ids_of(ref)
    return ids[0] if ids else None


def find_latest_image_id_fallback(project: str, service: str) -> str | None:
    """
    Fallback: scan docker images for the latest "<project>-<service>:latest".
    """
    ref = f"{sanitize_project_name(project)}-{service}:latest"
    cp = run(["docker", "images", "--format", "{{.Repository}}:{{.Tag}} {{.ID}}"], check=True)
    for line in cp.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        repo_tag, img_id = line.split(maxsplit=1)
        if repo_tag == ref:
            return img_id.strip()
    return None


def main():
    ap = argparse.ArgumentParser(
        description=(
            "PICAI: clean old container/image -> compose build -> tag -> save tar -> (optional remove image)"
        )
    )
    ap.add_argument("--service", default=None, help="docker compose service name (default: first service)")
    ap.add_argument("--project", default=None, help="compose project name (default: current dir name)")
    ap.add_argument("--repo", default="picai", help="image repo name, e.g. picai")
    ap.add_argument("--version", default="1.0.0", help="version tag, e.g. 1.0.0")
    ap.add_argument("--container", default="picai", help="container name to stop/rm, e.g. picai")
    ap.add_argument("--tar", default=None, help="output tar file (default: {repo}_{version}.tar)")
    ap.add_argument("--no-cache", action="store_true", help="add --no-cache to build")
    ap.add_argument("--keep-image", action="store_true", help="do not remove image after saving tar")
    ap.add_argument("--use-buildkit", action="store_true", help="enable BuildKit (disabled by default)")
    args = ap.parse_args()

    target_ref = f"{args.repo}:{args.version}"
    tar_name = args.tar or f"{args.repo}_{args.version}.tar"
    tar_path = Path(tar_name).resolve()

    # Default to BuildKit off to reduce mirror 401 issues
    env = os.environ.copy()
    if not args.use_buildkit:
        env["DOCKER_BUILDKIT"] = "0"
        env["COMPOSE_DOCKER_CLI_BUILD"] = "0"

    print("\n=== 0) stop/remove old container (if any) ===")
    docker_stop_rm_container(args.container)

    print("\n=== 1) remove old image tag (if any) ===")
    docker_remove_image_ref(target_ref)

    print("\n=== 2) docker compose build ===")
    build_cmd = ["docker", "compose", "build"]
    if args.no_cache:
        build_cmd.append("--no-cache")
    run(build_cmd, env=env, check=True)

    print("\n=== 3) docker images (show) ===")
    run(["docker", "images"], check=False)

    print("\n=== 4) find image ID from this build ===")
    svc, compose_ref = get_compose_service_image_ref(args.service, args.project)
    print(f"[i] target service={svc}")
    print(f"[i] expected compose image={compose_ref}")

    img_id = find_image_id_by_ref(compose_ref)
    if not img_id:
        proj = args.project or Path.cwd().name
        img_id = find_latest_image_id_fallback(proj, svc)

    if not img_id:
        raise SystemExit(
            "cannot find image ID from compose build.\n"
            "Try:\n"
            "  1) pass correct --service / --project\n"
            "  2) or add explicit image: in docker-compose.yml\n"
        )

    print(f"[OK] image ID = {img_id}")

    print(f"\n=== 5) docker tag {{ID}} {target_ref} ===")
    run(["docker", "tag", img_id, target_ref], check=True)

    print(f"\n=== 6) docker save -o {tar_path.name} {target_ref} ===")
    if tar_path.exists():
        bak = tar_path.with_suffix(tar_path.suffix + ".bak")
        print(f"[i] tar exists: {tar_path}; backing up to: {bak}")
        try:
            if bak.exists():
                bak.unlink()
            tar_path.rename(bak)
        except Exception as exc:
            print(f"[!] backup failed ({exc}); will overwrite: {tar_path}")

    run(["docker", "save", "-o", str(tar_path), target_ref], check=True)
    print(f"[OK] saved: {tar_path}")

    print("\n=== 7) stop/rm container again (ensure not running) ===")
    docker_stop_rm_container(args.container)

    print("\n=== 8) docker rmi -f {ID} (remove after packing) ===")
    if args.keep_image:
        print("[i] --keep-image enabled; skip image removal")
    else:
        run(["docker", "rmi", "-f", img_id], check=False)

    print("\n✓ done")


if __name__ == "__main__":
    main()
