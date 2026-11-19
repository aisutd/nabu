export const preferencesKey = 'nabu.preferences.v1'

export type LearnerPreferences = {
  name: string
  email: string
  demoSignedOut: boolean
  largerText: boolean
  reducedMotion: boolean
  dailyReminder: boolean
}

export function readPreferences(): LearnerPreferences {
  const defaults = { name: '', email: '', demoSignedOut: false, largerText: false, reducedMotion: false, dailyReminder: false }
  try {
    const saved = JSON.parse(localStorage.getItem(preferencesKey) ?? '{}') ?? {}
    return {
      name: typeof saved.name === 'string' ? saved.name : '',
      email: typeof saved.email === 'string' ? saved.email : '',
      demoSignedOut: saved.demoSignedOut === true,
      largerText: saved.largerText === true,
      reducedMotion: saved.reducedMotion === true,
      dailyReminder: saved.dailyReminder === true,
    }
  } catch {
    return defaults
  }
}

export function updatePreferences(change: Partial<LearnerPreferences>) {
  localStorage.setItem(preferencesKey, JSON.stringify({ ...readPreferences(), ...change }))
  window.dispatchEvent(new Event(preferencesKey))
}
