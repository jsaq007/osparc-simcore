import asyncio
import logging
from pathlib import Path
from typing import Final

from settings_library.r_clone import S3Provider

logger = logging.getLogger(__name__)

R_CLONE_CONFIG = """
[dst]
type = s3
provider = {destination_provider}
access_key_id = {destination_access_key}
secret_access_key = {destination_secret_key}
endpoint = {destination_endpoint}
region = {destination_region}
acl = private
"""
VOLUME_NAME_FIXED_PORTION: Final[int] = 78


def get_config_file_path(
    s3_endpoint: str,
    s3_access_key: str,
    s3_secret_key: str,
    s3_region: str,
    s3_provider: S3Provider,
) -> Path:
    config_content = R_CLONE_CONFIG.format(
        destination_provider=s3_provider,
        destination_access_key=s3_access_key,
        destination_secret_key=s3_secret_key,
        destination_endpoint=s3_endpoint,
        destination_region=s3_region,
    )
    conf_path = Path("/tmp/rclone_config.ini")  # NOSONAR
    conf_path.write_text(config_content)  # pylint:disable=unspecified-encoding
    return conf_path


def _get_dir_name(volume_name: str) -> str:
    # from: "dyv_a0430d06-40d2-4c92-9490-6aca30e00fc7_898fff63-d402-5566-a99b-091522dd2ae9_stuptuo_krow_nayvoj_emoh_"
    # gets: "home_jovyan_work_outputs"
    return volume_name[VOLUME_NAME_FIXED_PORTION:][::-1].strip("_")


def _get_s3_path(s3_bucket: str, labels: dict[str, str], volume_name: str) -> Path:

    joint_key = "/".join(
        (
            s3_bucket,
            labels["swarm_stack_name"],
            labels["study_id"],
            labels["node_uuid"],
            labels["run_id"],
            _get_dir_name(volume_name),
        )
    )
    return Path(f"/{joint_key}")


async def _read_stream(stream):
    while line := await stream.readline():
        logger.info(line.decode().strip("\n"))


async def store_to_s3(  # pylint:disable=too-many-locals,too-many-arguments
    volume_name: str,
    dyv_volume: dict,
    s3_endpoint: str,
    s3_access_key: str,
    s3_secret_key: str,
    s3_bucket: str,
    s3_region: str,
    s3_provider: S3Provider,
    s3_retries: int,
    s3_parallelism: int,
    exclude_files: list[str],
) -> None:
    config_file_path = get_config_file_path(
        s3_endpoint=s3_endpoint,
        s3_access_key=s3_access_key,
        s3_secret_key=s3_secret_key,
        s3_region=s3_region,
        s3_provider=s3_provider,
    )

    source_dir = dyv_volume["Mountpoint"]
    s3_path = _get_s3_path(s3_bucket, dyv_volume["Labels"], volume_name)

    r_clone_command = [
        "rclone",
        "--config",
        f"{config_file_path}",
        "--low-level-retries",
        "3",
        "--retries",
        f"{s3_retries}",
        "--transfers",
        f"{s3_parallelism}",
        "--stats",
        "5s",
        "--stats-one-line",
        "sync",
        f"{source_dir}",
        f"dst:{s3_path}",
        "-P",
    ]

    # add files to be ignored
    for to_exclude in exclude_files:
        r_clone_command.append("--exclude")
        r_clone_command.append(to_exclude)

    str_r_clone_command = " ".join(r_clone_command)
    logger.info(r_clone_command)

    process = await asyncio.create_subprocess_shell(
        str_r_clone_command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )

    await _read_stream(process.stdout)
    await process.wait()

    if process.returncode != 0:
        raise RuntimeError(
            f"Shell subprocesses yielded nonzero error code {process.returncode} "
            f"for command {str_r_clone_command}"
        )