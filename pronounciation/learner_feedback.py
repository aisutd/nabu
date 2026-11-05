"""Turn existing analysis into observations, without inventing neural thresholds."""


def learner_feedback(transcription, comparison):
    observations = []
    if transcription is not None:
        heard = transcription["heard"]
        observations.append(f'Recognized words: {heard or "No speech detected"}.')

    differences = []
    if comparison is not None:
        for item in comparison["feedback"]:
            for note in item["notes"]:
                if note != "Close to the example":
                    differences.append((item["stage"], note))
        if differences:
            stage, note = differences[0]
            observations.append(f'At the {stage}: {note.lower()}.')
        else:
            observations.append("No opening or width differences exceeded the current geometric thresholds.")

    if transcription is not None and not transcription["match"]:
        title = "Listen to your attempt again"
        action = "Replay your recording, then repeat the expected word clearly. Recognition can make mistakes."
    elif differences:
        stage, _ = differences[0]
        title = "Compare this part of the movement"
        action = f"Replay the {stage} of both clips. Notice the difference above, then record another attempt."
    elif comparison is not None:
        title = "Review your attempt"
        action = "Replay both clips and try another take. Similar mouth movement alone does not establish correct pronunciation."
    else:
        title = "Try another recording"
        action = "Keep your mouth visible, record one word with the microphone on, and review again."

    if transcription is not None and transcription["match"]:
        title = "You said the word correctly."

    neural = comparison.get("neural") if comparison else None
    return {
        "title": title,
        "observations": observations,
        "next_action": action,
        "neural_status": "available" if neural and neural.get("available") else "unavailable",
        "neural_note": "Neural similarity is included in the analysis workspace. It is not used to assign correctness without calibration.",
    }
