# add-silence2audio

A Node.js script to prepend 1.0 seconds of silence to audio files while preserving metadata and cover art.

This is a Node.js port of the original `add_silence.sh` script, designed to be easily run via `npx`.

## Features

- Prepends 1.0 seconds of silence to each input file.
- Preserves all original tags and metadata.
- Preserves embedded cover art if present.
- Matches the original audio bitrate when possible to maintain quality.
- Supports `.mp3` and `.m4a` files.
- Processes all supported audio files in the current directory.
- Places processed files into a `with_silence/` subdirectory.

## Requirements

- [Node.js](https://nodejs.org/) (which includes `npm` and `npx`)
- [ffmpeg](https://ffmpeg.org/download.html) and `ffprobe` must be installed and available in your system's PATH.

## Usage

This tool is designed to be run in the directory containing the audio files you want to process.

### Quickest Method (via npx)

The easiest way to use this tool is to run it directly from GitHub using `npx`. This requires no installation.

In your terminal, `cd` to the directory with your audio files and run:

```bash
npx git+https://github.com/cabbagekobe/add-silence2audio.git
```

The script will process the files and create a `with_silence` directory with the results.

### Local Installation (for offline use)

If you prefer to have a local copy, you can clone the repository and run it.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/cabbagekobe/add-silence2audio.git
    ```

2.  **Navigate to the audio file directory:**
    ```bash
    # For example:
    cd /path/to/your/music
    ```

3.  **Run the script using the local path:**
    Point `npx` to the cloned directory.
    ```bash
    # If you cloned it in your home directory, for example:
    npx ~/add-silence2audio
    ```
    Or, from within the cloned directory itself, you can simply run:
    ```bash
    npx .
    ```

## License

MIT — see [LICENSE](LICENSE)