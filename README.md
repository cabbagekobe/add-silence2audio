# add-silence

Add a short silence to the beginning of audio files while preserving metadata and cover art.

- Prepends 1.0 seconds of silence to each input file
- Preserves tags/metadata (`-map_metadata 1`)
- Preserves embedded cover art if present (`-map 1:v? -c:v copy`)
- Re-encodes with the same audio bitrate as the source when detectable
- Supports `.mp3` and `.m4a` in the current directory

## Requirements
- bash
- ffmpeg and ffprobe available in PATH

## Usage
```bash
bash add_silence.sh
```

By default, this script:
- Scans the current directory for `*.mp3` and `*.m4a`
- Creates output files in `with_silence/` with the same file names
- Matches the original audio bitrate when possible
- Falls back to reasonable quality when source bitrate is unknown (MP3: `-q:a 2`, AAC: `-b:a 192k`)

## Options
To change the silence duration or output directory, you can modify the variables near the top of the script:
- `outdir` — output directory name (default: `with_1_2s_silence`)
- The silence duration is defined in the `-t 1.2` argument in the ffmpeg command (change to your needs)

## Notes
- MP3 files are written with ID3v2.3 and ID3v1 tags for compatibility
- If the source includes embedded cover art, it is copied without re-encoding
- The script preserves metadata from the original audio stream

## License
MIT — see [LICENSE](LICENSE)
