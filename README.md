# MLVP - Video Player with Subtitle Features

A Tauri-based video player with advanced subtitle support and audio recording capabilities.

## Features

### Subtitle System
- **Pooled Subtitle Rendering**: All subtitle elements are pre-created when files are loaded and kept hidden. During playback, subtitles are shown/hidden dynamically for optimal performance.
- Support for VTT, SRT, ASS/SSA subtitle formats
- Real-time subtitle editing and offset adjustment
- Drag and drop subtitle file support
- Customizable subtitle positioning and sizing
- Audio capture for individual subtitle lines (±2 second buffer)
- Subtitle text copying with Shift+Click

### Audio Recording
- Record audio buffer from video (10-60 seconds configurable)
- Capture audio for specific subtitle time ranges
- High-quality WAV file output with automatic timestamping
- Copy audio as data URL to clipboard
- No interference with video playback

### Performance Optimizations
- **Subtitle Element Pooling**: Pre-creates all subtitle DOM elements when files load, then shows/hides them as needed instead of creating/destroying elements during playback
- Efficient circular buffer for audio recording
- Minimal DOM manipulation during subtitle rendering

## Subtitle Pooling Implementation

The subtitle pooling system works by:

1. **Pre-creation**: When subtitle files are loaded, all subtitle cue elements are created immediately and stored in a global pool
2. **Hidden by Default**: All pooled elements start with `display: none`
3. **Show/Hide Logic**: During video playback, elements are shown (`display: flex`) or hidden based on current time
4. **Memory Efficiency**: No DOM creation/destruction during playback, just style changes
5. **Shared Pool**: Single global pool instance shared across all components

This approach significantly improves performance when dealing with subtitle files containing hundreds or thousands of cues.

## Usage

1. **Load Video**: Drag and drop a video file or click to select
2. **Add Subtitles**: Drag subtitle files onto the video area or use the dedicated subtitle drop zone
3. **Capture Audio**: 
   - Enable "Audio Recording" panel for buffer recording
   - Click 🎤 buttons on individual subtitle lines for time-specific capture
4. **Customize**: Drag subtitles to reposition, scroll to resize, adjust timing offset

## Technical Details

- Built with React + TypeScript + Tauri
- Web Audio API for audio capture and processing
- HTML5 Video API for video playback
- Efficient subtitle parsing and rendering system
- Cross-platform desktop application