#!/usr/bin/env bash
# add_silence.sh
#
# MIT License
# Copyright (c) 2025 cabbagekobe
#
# This script prepends 1.0 seconds of silence to audio files while preserving
# metadata and cover art, and matches the original audio bitrate when possible.

set -euo pipefail
outdir="with_silence"
mkdir -p "$outdir"
shopt -s nullglob

for f in *.mp3 *.m4a; do
  [ -e "$f" ] || continue
  ext="${f##*.}"
  base="${f%.*}"
  lowext=$(printf "%s" "$ext" | tr 'A-Z' 'a-z')

  # Probe audio params
  sr=$(ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of default=nk=1:nw=1 "$f" || true)
  cl=$(ffprobe -v error -select_streams a:0 -show_entries stream=channel_layout -of default=nk=1:nw=1 "$f" || true)
  [ -n "$sr" ] || sr=44100
  if [ -z "$cl" ] || [ "$cl" = "unknown" ]; then cl=stereo; fi

  # Detect if cover art / video stream exists
  has_v=$(ffprobe -v error -select_streams v:0 -show_entries stream=index -of csv=p=0 "$f" || true)

  # Determine original audio bitrate in kbps (from audio stream)
  br_kbps=$(ffprobe -v error -select_streams a:0 -show_entries stream=bit_rate -of default=nk=1:nw=1 "$f" | awk 'NR==1{ if($1+0>0){print int(($1+0)/1000)} }') || br_kbps=""

  # Choose audio codec and set bitrate to match source when available
  abitrate=()
  id3opts=()
  case "$lowext" in
    mp3)
      codec_a="libmp3lame"
      if [ -n "${br_kbps}" ] && [ "${br_kbps}" -gt 0 ]; then
        abitrate=(-b:a "${br_kbps}k")
      else
        # Fallback for VBR/unknown bitrate sources
        abitrate=(-q:a 2)
      fi
      id3opts=(-id3v2_version 3 -write_id3v1 1)
      ;;
    m4a|aac|mp4|m4b)
      codec_a="aac"
      if [ -n "${br_kbps}" ] && [ "${br_kbps}" -gt 0 ]; then
        abitrate=(-b:a "${br_kbps}k")
      else
        # Fallback quality for unknown bitrate
        abitrate=(-b:a 192k)
      fi
      ;;
    *)
      codec_a="aac"
      if [ -n "${br_kbps}" ] && [ "${br_kbps}" -gt 0 ]; then
        abitrate=(-b:a "${br_kbps}k")
      else
        abitrate=(-b:a 192k)
      fi
      ;;
  esac

  out="$outdir/${base}.${ext}"
  echo "Processing: $f -> $out (target bitrate: ${br_kbps:-unknown} kbps)"

  # Build ffmpeg command safely as array
  cmd=(ffmpeg -hide_banner -y \
    -f lavfi -t 1 -i "anullsrc=r=${sr}:cl=${cl}" \
    -i "$f" \
    -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[a]" \
    -map "[a]" \
    -map_metadata 1 \
    -c:a "$codec_a")

  cmd+=("${abitrate[@]}")

  # If cover art/video exists, map and copy it
  if [ -n "$has_v" ]; then
    cmd+=(-map "1:v?" -c:v copy)
  fi

  # ID3 options for mp3
  [ ${#id3opts[@]} -gt 0 ] && cmd+=("${id3opts[@]}")

  cmd+=("$out")
  "${cmd[@]}"

done

echo "Done. Outputs are in: $outdir"
