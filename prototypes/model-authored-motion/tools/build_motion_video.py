"""Build the throwaway Image 2 keyframe motion study as a seamless MP4."""

from __future__ import annotations

import argparse
import math
import shutil
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np


SCRIPT_PATH = Path(__file__).resolve()
REPO_ROOT = SCRIPT_PATH.parents[3]
DEFAULT_INPUTS = (
    REPO_ROOT / "assets/brand/backgrounds/hero-background-light-right-v1.png",
    REPO_ROOT / "assets/experiments/motion/hero-keyframe-01-v1.png",
    REPO_ROOT / "assets/experiments/motion/hero-keyframe-02-v1.png",
)
DEFAULT_OUTPUT = REPO_ROOT / "assets/experiments/motion/hero-loop-optical-v1.mp4"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Interpolate three model-authored frames with bidirectional dense optical flow."
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--width", type=int, default=1600)
    parser.add_argument("--height", type=int, default=800)
    parser.add_argument("--fps", type=int, default=24)
    parser.add_argument("--duration", type=float, default=7.5)
    parser.add_argument("--flow-scale", type=float, default=0.5)
    parser.add_argument("--max-flow", type=float, default=36.0)
    parser.add_argument("--crf", type=int, default=17)
    return parser.parse_args()


def find_ffmpeg() -> str:
    executable = shutil.which("ffmpeg")
    if executable:
        return executable

    try:
        import imageio_ffmpeg
    except ImportError as error:
        raise RuntimeError(
            "ffmpeg was not found. Install the tools/requirements-motion.txt dependencies."
        ) from error

    return imageio_ffmpeg.get_ffmpeg_exe()


def load_image(path: Path, size: tuple[int, int]) -> np.ndarray:
    image = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(f"Could not read image: {path}")
    return cv2.resize(image, size, interpolation=cv2.INTER_LANCZOS4)


def clamp_flow(flow: np.ndarray, maximum: float) -> np.ndarray:
    magnitude = np.linalg.norm(flow, axis=2)
    limiter = np.minimum(1.0, maximum / np.maximum(magnitude, 1e-6))
    flow *= limiter[..., None]
    return flow


def calculate_flow(
    source: np.ndarray,
    target: np.ndarray,
    flow_scale: float,
    max_flow: float,
) -> np.ndarray:
    height, width = source.shape[:2]
    flow_width = max(320, round(width * flow_scale))
    flow_height = max(160, round(height * flow_scale))

    source_small = cv2.resize(source, (flow_width, flow_height), interpolation=cv2.INTER_AREA)
    target_small = cv2.resize(target, (flow_width, flow_height), interpolation=cv2.INTER_AREA)
    source_gray = cv2.cvtColor(source_small, cv2.COLOR_BGR2GRAY)
    target_gray = cv2.cvtColor(target_small, cv2.COLOR_BGR2GRAY)
    source_gray = cv2.GaussianBlur(source_gray, (0, 0), 1.2)
    target_gray = cv2.GaussianBlur(target_gray, (0, 0), 1.2)

    if hasattr(cv2, "DISOpticalFlow_create"):
        estimator = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
        estimator.setUseSpatialPropagation(True)
        estimator.setVariationalRefinementIterations(7)
        flow_small = estimator.calc(source_gray, target_gray, None)
    else:
        flow_small = cv2.calcOpticalFlowFarneback(
            source_gray,
            target_gray,
            None,
            0.5,
            5,
            25,
            5,
            7,
            1.5,
            0,
        )

    flow = cv2.resize(flow_small, (width, height), interpolation=cv2.INTER_LINEAR)
    flow[..., 0] *= width / flow_width
    flow[..., 1] *= height / flow_height
    flow = cv2.GaussianBlur(flow, (0, 0), 0.8)
    return clamp_flow(flow, max_flow)


def warp(image: np.ndarray, flow: np.ndarray, amount: float, grid: tuple[np.ndarray, np.ndarray]) -> np.ndarray:
    grid_x, grid_y = grid
    map_x = grid_x - amount * flow[..., 0]
    map_y = grid_y - amount * flow[..., 1]
    return cv2.remap(
        image,
        map_x,
        map_y,
        interpolation=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REFLECT_101,
    )


def interpolate(
    source: np.ndarray,
    target: np.ndarray,
    forward_flow: np.ndarray,
    backward_flow: np.ndarray,
    progress: float,
    grid: tuple[np.ndarray, np.ndarray],
) -> np.ndarray:
    if progress <= 0:
        return source
    if progress >= 1:
        return target

    source_warped = warp(source, forward_flow, progress, grid)
    target_warped = warp(target, backward_flow, 1.0 - progress, grid)
    frame = cv2.addWeighted(source_warped, 1.0 - progress, target_warped, progress, 0.0)

    # Restore a small amount of micro-contrast lost during aligned blending.
    detail_strength = 0.46 * (4.0 * progress * (1.0 - progress))
    softened = cv2.GaussianBlur(frame, (0, 0), 0.72)
    return cv2.addWeighted(frame, 1.0 + detail_strength, softened, -detail_strength, 0.0)


def ease_in_out(progress: float) -> float:
    return 0.5 - 0.5 * math.cos(math.pi * progress)


def frame_counts(total_frames: int, segment_count: int) -> list[int]:
    base = total_frames // segment_count
    remainder = total_frames % segment_count
    return [base + (1 if index < remainder else 0) for index in range(segment_count)]


def describe_flow(label: str, flow: np.ndarray) -> None:
    magnitude = np.linalg.norm(flow, axis=2)
    print(
        f"{label}: mean={magnitude.mean():.2f}px "
        f"p95={np.percentile(magnitude, 95):.2f}px max={magnitude.max():.2f}px"
    )


def build_video(args: argparse.Namespace) -> None:
    if args.width % 2 or args.height % 2:
        raise ValueError("H.264 yuv420p output requires even width and height values.")
    if not 0.2 <= args.flow_scale <= 1.0:
        raise ValueError("--flow-scale must be between 0.2 and 1.0.")

    size = (args.width, args.height)
    images = [load_image(path, size) for path in DEFAULT_INPUTS]
    pairs = [(images[0], images[1]), (images[1], images[2]), (images[2], images[0])]

    print("Calculating bidirectional flow fields...")
    flows: list[tuple[np.ndarray, np.ndarray]] = []
    for index, (source, target) in enumerate(pairs, start=1):
        forward = calculate_flow(source, target, args.flow_scale, args.max_flow)
        backward = calculate_flow(target, source, args.flow_scale, args.max_flow)
        describe_flow(f"segment {index} forward", forward)
        describe_flow(f"segment {index} backward", backward)
        flows.append((forward, backward))

    total_frames = round(args.duration * args.fps)
    counts = frame_counts(total_frames, len(pairs))
    grid_y, grid_x = np.mgrid[0 : args.height, 0 : args.width].astype(np.float32)
    grid = (grid_x, grid_y)

    args.output = args.output.resolve()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = find_ffmpeg()
    command = [
        ffmpeg,
        "-y",
        "-loglevel",
        "error",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "bgr24",
        "-s:v",
        f"{args.width}x{args.height}",
        "-r",
        str(args.fps),
        "-i",
        "-",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        str(args.crf),
        "-profile:v",
        "high",
        "-pix_fmt",
        "yuv420p",
        "-g",
        str(args.fps * 2),
        "-movflags",
        "+faststart",
        "-metadata",
        "title=Soundscape model-authored optical-flow motion study",
        "-metadata",
        "comment=Derived from hero-background-light-right-v1 and two Image 2 keyframes",
        str(args.output),
    ]

    print(f"Encoding {total_frames} frames to {args.output}...")
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert process.stdin is not None
    try:
        for pair_index, ((source, target), (forward, backward), count) in enumerate(
            zip(pairs, flows, counts), start=1
        ):
            for frame_index in range(count):
                linear_progress = frame_index / count
                progress = ease_in_out(linear_progress)
                frame = interpolate(source, target, forward, backward, progress, grid)
                process.stdin.write(frame.tobytes())
            print(f"segment {pair_index}: {count} frames")
    finally:
        process.stdin.close()

    return_code = process.wait()
    if return_code != 0:
        raise RuntimeError(f"ffmpeg failed with exit code {return_code}")

    size_mb = args.output.stat().st_size / (1024 * 1024)
    print(f"Done: {args.duration:.2f}s, {args.fps}fps, {size_mb:.2f} MiB")


def main() -> int:
    try:
        build_video(parse_args())
    except (FileNotFoundError, RuntimeError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
