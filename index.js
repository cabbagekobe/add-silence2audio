#!/usr/bin/env node

// index.js
//
// MIT License
// Copyright (c) 2025 cabbagekobe
//
// This script prepends 1.0 seconds of silence to audio files while preserving
// metadata and cover art, and matches the original audio bitrate when possible.

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

const outdir = 'with_silence';

// Helper function to run a command and capture its stdout
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        // console.error(`Error executing ${command} ${args.join(' ')}`);
        // console.error(stderr);
        // Resolve with a specific value to indicate error or empty output
        resolve(null);
      } else {
        resolve(stdout.trim());
      }
    });

    proc.on('error', (err) => {
      // e.g. command not found
      // console.error(`Failed to start ${command}`);
      // console.error(err);
      reject(err);
    });
  });
}


async function main() {
  try {
    await fs.mkdir(outdir, { recursive: true });
  } catch (err) {
    console.error(`Failed to create output directory: ${outdir}`, err);
    return;
  }

  const files = await fs.readdir('.');
  const audioFiles = files.filter(f => f.endsWith('.mp3') || f.endsWith('.m4a'));

  if (audioFiles.length === 0) {
    console.log("No .mp3 or .m4a files found in the current directory.");
    return;
  }


  for (const f of audioFiles) {
    const ext = path.extname(f);
    const base = path.basename(f, ext);
    const lowext = ext.toLowerCase();

    // Probe audio params
    let sr = await runCommand('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate', '-of', 'default=nk=1:nw=1', f]) || '44100';
    let cl = await runCommand('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channel_layout', '-of', 'default=nk=1:nw=1', f]) || 'stereo';
    if (cl === 'unknown') {
      cl = 'stereo';
    }

    // Detect if cover art / video stream exists
    const has_v = await runCommand('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=index', '-of', 'csv=p=0', f]);

    // Determine original audio bitrate in kbps
    const br_raw = await runCommand('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=bit_rate', '-of', 'default=nk=1:nw=1', f]);
    const br_kbps = br_raw ? parseInt(br_raw / 1000, 10) : null;


    let codec_a = 'aac';
    const abitrate = [];
    const id3opts = [];

    switch (lowext) {
      case '.mp3':
        codec_a = 'libmp3lame';
        if (br_kbps && br_kbps > 0) {
          abitrate.push('-b:a', `${br_kbps}k`);
        } else {
          abitrate.push('-q:a', '2'); // VBR fallback
        }
        id3opts.push('-id3v2_version', '3', '-write_id3v1', '1');
        break;
      case '.m4a': // and other aac compatible
      case '.aac':
      case '.mp4':
      case '.m4b':
        codec_a = 'aac';
        if (br_kbps && br_kbps > 0) {
          abitrate.push('-b:a', `${br_kbps}k`);
        } else {
          abitrate.push('-b:a', '192k'); // fallback bitrate
        }
        break;
      default:
        if (br_kbps && br_kbps > 0) {
            abitrate.push('-b:a', `${br_kbps}k`);
        } else {
            abitrate.push('-b:a', '192k');
        }
        break;
    }

    const out = path.join(outdir, `${base}${ext}`);
    console.log(`Processing: ${f} -> ${out} (target bitrate: ${br_kbps || 'unknown'} kbps)`);

    const cmd = [
        '-hide_banner', '-y',
        '-f', 'lavfi', '-t', '1', '-i', `anullsrc=r=${sr}:cl=${cl}`,
        '-i', f,
        '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1[a]',
        '-map', '[a]',
        '-map_metadata', '1',
        '-c:a', codec_a,
        ...abitrate
    ];

    if (has_v) {
        cmd.push('-map', '1:v?', '-c:v', 'copy');
    }

    if (id3opts.length > 0) {
        cmd.push(...id3opts);
    }

    cmd.push(out);

    // Execute ffmpeg
    const ffmpeg = spawn('ffmpeg', cmd, { stdio: 'inherit' });

    await new Promise((resolve, reject) => {
        ffmpeg.on('close', code => {
            if (code === 0) {
                resolve();
            } else {
                console.error(`\nffmpeg failed for ${f}.`);
                // The ffmpeg error output is already piped to stderr via 'inherit'
                resolve(); // Resolve anyway to continue with next file
            }
        });
        ffmpeg.on('error', err => {
            console.error(`Failed to start ffmpeg for ${f}`, err);
            reject(err); // This would stop the whole script
        });
    });

  }
  console.log(`Done. Outputs are in: ${outdir}`);
}

main().catch(err => {
    console.error("An unexpected error occurred:", err);
    // Try to check if ffmpeg is installed
    runCommand('ffmpeg', ['-version']).catch(() => {
        console.error("\nHint: This script requires 'ffmpeg' and 'ffprobe' to be installed and available in your system's PATH.");
    });
});
