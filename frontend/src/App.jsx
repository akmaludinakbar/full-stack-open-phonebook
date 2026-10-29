import { useEffect, useRef, useState } from 'react'
import Filter from './components/Filter'
import PersonForm from './components/PersonForm'
import Persons from './components/Persons'
import personService from './services/persons'

export default function App() {
  const [persons, setPersons] = useState([])
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [filter, setFilter] = useState('')
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const submissionInFlight = useRef(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(false)
    setNotice(null)
    personService.getAll()
      .then(data => { if (active) setPersons(data) })
      .catch(() => { if (active) { setLoadError(true); setNotice({ kind: 'error', text: 'Could not load phonebook. Check the server and retry.' }) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reloadKey])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const show = (kind, text) => setNotice({ kind, text })
  const clearForm = () => { setName(''); setNumber('') }

  const submit = async event => {
    event.preventDefault()
    if (loading || loadError || submissionInFlight.current) return
    const trimmedName = name.trim()
    const trimmedNumber = number.trim()
    if (!trimmedName || !trimmedNumber) return
    const existing = persons.find(person => person.name.toLowerCase() === trimmedName.toLowerCase())
    if (existing) {
      if (existing.number === trimmedNumber) {
        show('error', `${existing.name} is already in the phonebook.`)
        return
      }
      if (!window.confirm(`Replace ${existing.name}'s number with ${trimmedNumber}?`)) return
      submissionInFlight.current = true
      setSaving(true)
      try {
        const updated = await personService.update(existing.id, { ...existing, number: trimmedNumber })
        setPersons(current => current.map(person => person.id === existing.id ? updated : person))
        show('success', `Updated ${existing.name}.`)
        clearForm()
      } catch (error) {
        if (error.response?.status === 404) {
          setPersons(current => current.filter(person => person.id !== existing.id))
          show('error', `${existing.name} was already removed from the server.`)
        } else show('error', error.response?.data?.error || `Could not update ${existing.name}.`)
      } finally {
        submissionInFlight.current = false
        setSaving(false)
      }
      return
    }
    submissionInFlight.current = true
    setSaving(true)
    try {
      const created = await personService.create({ name: trimmedName, number: trimmedNumber })
      setPersons(current => current.concat(created))
      show('success', `Added ${trimmedName}.`)
      clearForm()
    } catch (error) {
      show('error', error.response?.data?.error || `Could not add ${trimmedName}.`)
    } finally {
      submissionInFlight.current = false
      setSaving(false)
    }
  }

  const deletePerson = async person => {
    if (!window.confirm(`Delete ${person.name}?`)) return
    try {
      await personService.remove(person.id)
      setPersons(current => current.filter(item => item.id !== person.id))
      show('success', `Deleted ${person.name}.`)
    } catch (error) {
      if (error.response?.status === 404) {
        setPersons(current => current.filter(item => item.id !== person.id))
        show('error', `${person.name} was already removed from the server.`)
      } else show('error', `Could not delete ${person.name}.`)
    }
  }

  const visible = persons.filter(person => person.name.toLowerCase().includes(filter.trim().toLowerCase()))
  return <main>
    <h1>Phonebook</h1>
    {notice && <p className={`notification ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
    {loadError && <button type="button" onClick={() => setReloadKey(key => key + 1)}>Retry loading</button>}
    <Filter value={filter} onChange={event => setFilter(event.target.value)} />
    <h2>Add a new person</h2>
    <PersonForm name={name} number={number} onNameChange={event => setName(event.target.value)} onNumberChange={event => setNumber(event.target.value)} onSubmit={submit} disabled={loading || loadError || saving} />
    <h2>Numbers</h2>
    {loading ? <p>Loading people…</p> : <Persons persons={visible} onDelete={deletePerson} />}
  </main>
}
