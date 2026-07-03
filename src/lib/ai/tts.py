"""Edge TTS wrapper for BarbieVerse audio generation.
Free Microsoft neural voices - no API key needed.

Usage:
    python tts.py --text "Hello world" --voice "en-US-JennyNeural" --output "output.mp3"
    python tts.py --text "Hello" --voice "en-US-GuyNeural" --output "out.mp3" --rate "+10%"
    python tts.py --list-voices
"""

import argparse
import asyncio
import edge_tts
import json
import os
import sys

# ── Voice Presets ───────────────────────────────────────

VOICE_PRESETS = {
    # English (US) - Professional
    "jenny": "en-US-JennyNeural",
    "guy": "en-US-GuyNeural",
    "aria": "en-US-AriaNeural",
    "davis": "en-US-DavisNeural",
    "tony": "en-US-TonyNeural",
    "nancy": "en-US-NancyNeural",
    "sara": "en-US-SaraNeural",
    "andrew": "en-US-AndrewNeural",
    "emma": "en-US-EmmaNeural",
    "brian": "en-US-BrianNeural",
    
    # English (India) - For Indian audience
    "neerja": "en-IN-NeerjaNeural",
    "neerja-expressive": "en-IN-NeerjaExpressiveNeural",
    "prabhat": "en-IN-PrabhatNeural",
    
    # English (UK) - British accent
    "sonia": "en-GB-SoniaNeural",
    "ryan": "en-GB-RyanNeural",
    
    # Content-specific presets
    "carousel-narrator": "en-US-JennyNeural",      # Friendly, engaging
    "reel-voiceover": "en-US-AriaNeural",           # Energetic
    "blog-reader": "en-US-GuyNeural",               # Professional
    "story-narrator": "en-US-SaraNeural",           # Warm
    "promo-voice": "en-US-AndrewNeural",            # Confident
    "indian-host": "en-IN-NeerjaExpressiveNeural",             # Indian accent
}

# ── TTS Engine ─────────────────────────────────────────

async def generate_tts(text: str, voice: str, output: str, rate: str = "+0%", volume: str = "+0%"):
    """Generate speech from text using Edge TTS."""
    # Resolve voice preset
    voice_id = VOICE_PRESETS.get(voice, voice)
    
    communicate = edge_tts.Communicate(
        text=text,
        voice=voice_id,
        rate=rate,
        volume=volume,
    )
    
    await communicate.save(output)
    
    # Return file info
    file_size = os.path.getsize(output)
    return {
        "output": output,
        "voice": voice_id,
        "size_bytes": file_size,
        "size_kb": round(file_size / 1024, 2),
    }

async def list_voices():
    """List all available voices."""
    voices = await edge_tts.list_voices()
    return voices

async def generate_subtitle(text: str, voice: str, output: str):
    """Generate TTS with subtitle/VTT file."""
    voice_id = VOICE_PRESETS.get(voice, voice)
    
    communicate = edge_tts.Communicate(text=text, voice=voice_id)
    submaker = edge_tts.SubMaker()
    
    with open(output, "wb") as f:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                submaker.create_sub(
                    (chunk["offset"], chunk["duration"]),
                    chunk["text"]
                )
    
    # Save VTT subtitle
    vtt_output = output.rsplit(".", 1)[0] + ".vtt"
    with open(vtt_output, "w") as f:
        f.write(submaker.generate_subs())
    
    return {
        "audio": output,
        "subtitle": vtt_output,
        "voice": voice_id,
    }

# ── CLI ────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="BarbieVerse TTS")
    parser.add_argument("--text", type=str, help="Text to convert to speech")
    parser.add_argument("--text-file", type=str, help="File containing text to speak")
    parser.add_argument("--voice", type=str, default="jenny", help="Voice name or preset")
    parser.add_argument("--output", type=str, default="output.mp3", help="Output file path")
    parser.add_argument("--rate", type=str, default="+0%", help="Speech rate (e.g., +10%, -20%)")
    parser.add_argument("--volume", type=str, default="+0%", help="Volume (e.g., +50%)")
    parser.add_argument("--list-voices", action="store_true", help="List available voices")
    parser.add_argument("--list-presets", action="store_true", help="List voice presets")
    parser.add_argument("--subtitles", action="store_true", help="Generate VTT subtitles")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    if args.list_voices:
        voices = asyncio.run(list_voices())
        for v in voices:
            print(f"{v['ShortName']:40s} {v['Gender']:8s} {v['Locale']}")
        return
    
    if args.list_presets:
        for name, voice_id in VOICE_PRESETS.items():
            print(f"{name:25s} -> {voice_id}")
        return
    
    # Get text
    text = args.text
    if args.text_file:
        with open(args.text_file, "r") as f:
            text = f.read()
    
    if not text:
        print("Error: --text or --text-file required", file=sys.stderr)
        sys.exit(1)
    
    # Generate
    if args.subtitles:
        result = asyncio.run(generate_subtitle(text, args.voice, args.output))
    else:
        result = asyncio.run(generate_tts(text, args.voice, args.output, args.rate, args.volume))
    
    if args.json:
        print(json.dumps(result))
    else:
        print(f"Generated: {result['output']} ({result['size_kb']} KB) using {result['voice']}")

if __name__ == "__main__":
    main()
