from pathlib import Path
import time
import wave
import sounddevice as sd

class AudioRecorder:

    # Establish mic settings
    def __init__(self, sample_rate: int = 16000):
        # Set audio samples
        self.sample_rate = sample_rate
        # Only 1 channel is used
        self.channels = 1
        # no recording is yet active
        self._stream = None
        # Save data while its recording
        self._chunks: list[bytes] = []
        # Save start time
        self._started_ns: int | None = None
        # Save warnings too
        self._warnings: list[str] = []

    @property
    def started_ns(self) -> int | None:

        # Get time when it started recording
        return self._started_ns

    # Get audio data from mic, while it's recording
    def _callback(self, indata, frames, time_info, status):

        # Check for any warnings
        if status:
            # Store any issues in recording
            self._warnings.append(str(status))

        # save audio as bytes
        self._chunks.append(bytes(indata))

    # Begin recording
    def start(self) -> None:

        # check if double recording
        if self._stream is not None:
            raise RuntimeError("Audio recording is already active")

        # Clear any data from previous recording
        self._chunks.clear()
        # Clear any warnings
        self._warnings.clear()
        # reset the previous start time
        self._started_ns = None

        # Setup for capturing
        stream = sd.RawInputStream(
            samplerate=self.sample_rate,
            channels=self.channels,
            dtype="int16",
            callback=self._callback,
        )

        try:

            # Store when recording starts
            self._started_ns = time.monotonic_ns()
            # Begin recording
            stream.start()
        except Exception:

            # Close mic if it failed to record
            stream.close()
            # reset time, report error
            self._started_ns = None
            raise
        self._stream = stream

    # STOP
    def stop(self) -> None:

        # End the recording
        if self._stream is not None:
            self._stream.stop()
            self._stream.close()
            self._stream = None

    # SAVE
    def save(self, path: str | Path) -> Path:

        # Save recording as uncompressed WAV audio files
        # Make sure mic stopped
        if self._stream is not None:
            raise RuntimeError("Stop audio recording before saving")
        # make sure we recorded
        if not self._chunks:
            raise ValueError("No microphone samples were captured")

        # Get location where WAV is going to be saved
        output = Path(path)
        # Make output dir
        output.parent.mkdir(parents=True, exist_ok=True)
        # Make WAV file
        with wave.open(str(output), "wb") as wav:
            wav.setnchannels(self.channels)
            wav.setsampwidth(2)  # Signed 16-bit PCM = 2 bytes/sample.
            wav.setframerate(self.sample_rate)
            wav.writeframes(b"".join(self._chunks))
        # return its location
        return output

    # DISCARD
    def discard(self) -> None:

        # If invalid recording, stop recording and clear audio data
        self.stop()
        self._chunks.clear()

    @property
    def warnings(self) -> tuple[str, ...]:
        # return audio warnings
        return tuple(self._warnings)

# MAIN
def main() -> None:

    # standalone audio test before using webcam
    input("Press Enter to record your microphone for 3 seconds...")
    recorder = AudioRecorder()
    try:
        # start
        recorder.start()
        # Tell user a prompt
        print("Recording... say a word now")
        time.sleep(3)
    finally:
        # end
        recorder.stop()

    # Set location of WAV, then save it
    output = Path(r"C:\NabuData\audio_tests\microphone_test.wav")
    recorder.save(output)
    print(f"Saved: {output}")
    # check if there were any warnings
    if recorder.warnings:
        print("Audio device warnings:", "; ".join(recorder.warnings))
    # Otherwise, success
    print("Microphone test complete; no webcam data was changed.")


if __name__ == "__main__":
    main()
