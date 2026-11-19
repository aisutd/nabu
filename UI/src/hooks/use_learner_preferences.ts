import { useEffect, useState } from 'react'
import { preferencesKey, readPreferences } from '../data/learner_preferences'

export default function useLearnerPreferences() {
  const [preferences, setPreferences] = useState(readPreferences)
  useEffect(() => {
    function refresh() { setPreferences(readPreferences()) }
    window.addEventListener(preferencesKey, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(preferencesKey, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  return preferences
}
