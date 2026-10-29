import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import personService from './services/persons'

vi.mock('./services/persons', () => ({ default: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() } }))
const deferred = () => {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}
const initial = [{ id: '1', name: 'Ada Example', number: '111' }, { id: '2', name: 'Bo Sample', number: '222' }]
const fill = (name, number) => {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Number'), { target: { value: number } })
}
beforeEach(() => {
  vi.clearAllMocks()
  personService.getAll.mockResolvedValue(initial)
  vi.stubGlobal('confirm', vi.fn(() => true))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

test('loads people and filters names without case sensitivity', async () => {
  render(<App />)
  expect(await screen.findByText(/Ada Example 111/)).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Filter by name'), { target: { value: 'aDa' } })
  expect(screen.getByText(/Ada Example 111/)).toBeTruthy()
  expect(screen.queryByText(/Bo Sample 222/)).toBeNull()
})

test('creates a person and shows a success notification', async () => {
  personService.create.mockResolvedValue({ id: '3', name: 'Cy Test', number: '333' })
  render(<App />)
  await screen.findByText(/Ada Example 111/)
  fill('Cy Test', '333')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(await screen.findByText(/Cy Test 333/)).toBeTruthy()
  expect(screen.getByRole('status').textContent).toMatch(/Added Cy Test/)
})

test('confirms and replaces the number of an existing person', async () => {
  personService.update.mockResolvedValue({ id: '1', name: 'Ada Example', number: '999' })
  render(<App />)
  await screen.findByText(/Ada Example 111/)
  fill('Ada Example', '999')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(await screen.findByText(/Ada Example 999/)).toBeTruthy()
  expect(window.confirm).toHaveBeenCalledOnce()
  expect(screen.getByRole('status').textContent).toMatch(/Updated Ada Example/)
})

test('deletes a person after confirmation', async () => {
  personService.remove.mockResolvedValue({})
  render(<App />)
  await screen.findByText(/Ada Example 111/)
  fireEvent.click(screen.getByRole('button', { name: 'Delete Ada Example' }))
  await waitFor(() => expect(screen.queryByText(/Ada Example 111/)).toBeNull())
})

test('reports a stale update and removes the missing person locally', async () => {
  personService.update.mockRejectedValue({ response: { status: 404 } })
  render(<App />)
  await screen.findByText(/Ada Example 111/)
  fill('Ada Example', '999')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringMatching(/already removed/))
  expect(screen.queryByText(/Ada Example 111/)).toBeNull()
})

test('reports failed initial loading', async () => {
  personService.getAll.mockRejectedValue(new Error('offline'))
  render(<App />)
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringMatching(/Could not load/))
})

test('waits for initial GET before allowing duplicate detection or a POST', async () => {
  const load = deferred()
  personService.getAll.mockReturnValue(load.promise)
  render(<App />)
  fill('Ada Example', '111')
  const add = screen.getByRole('button', { name: 'Add' })
  expect(add.disabled).toBe(true)
  fireEvent.submit(add.closest('form'))
  expect(personService.create).not.toHaveBeenCalled()
  await act(async () => load.resolve(initial))
  expect(add.disabled).toBe(false)
  fireEvent.click(add)
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringMatching(/already in the phonebook/))
  expect(personService.create).not.toHaveBeenCalled()
})

test('a failed initial GET keeps add blocked until retry loads people', async () => {
  const load = deferred()
  personService.getAll.mockReturnValueOnce(load.promise).mockResolvedValueOnce(initial)
  render(<App />)
  fill('Cy Test', '333')
  await act(async () => load.reject(new Error('offline')))
  expect(screen.getByRole('button', { name: 'Add' }).disabled).toBe(true)
  fireEvent.submit(screen.getByRole('button', { name: 'Add' }).closest('form'))
  expect(personService.create).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Retry loading' }))
  expect(await screen.findByText(/Ada Example 111/)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Add' }).disabled).toBe(false)
  expect(screen.queryByRole('alert')).toBeNull()
})

test('overlapping submits make one POST and re-enable the form on success', async () => {
  const create = deferred()
  personService.create.mockReturnValue(create.promise)
  render(<App />)
  await screen.findByText(/Ada Example 111/)
  fill('Cy Test', '333')
  const add = screen.getByRole('button', { name: 'Add' })
  fireEvent.click(add)
  expect(add.disabled).toBe(true)
  fireEvent.submit(add.closest('form'))
  expect(personService.create).toHaveBeenCalledTimes(1)
  await act(async () => create.resolve({ id: '3', name: 'Cy Test', number: '333' }))
  expect(screen.getAllByText(/Cy Test 333/)).toHaveLength(1)
  expect(add.disabled).toBe(false)
})

test('a failed POST releases the guard for a retry', async () => {
  const create = deferred()
  personService.create.mockReturnValueOnce(create.promise).mockResolvedValueOnce({ id: '3', name: 'Cy Test', number: '333' })
  render(<App />)
  await screen.findByText(/Ada Example 111/)
  fill('Cy Test', '333')
  const add = screen.getByRole('button', { name: 'Add' })
  fireEvent.click(add)
  await act(async () => create.reject(new Error('offline')))
  expect(screen.getByRole('alert').textContent).toMatch(/Could not add Cy Test/)
  expect(add.disabled).toBe(false)
  fireEvent.click(add)
  expect(await screen.findByText(/Cy Test 333/)).toBeTruthy()
  expect(personService.create).toHaveBeenCalledTimes(2)
})

test('shows the backend validation error when a new number is invalid', async () => {
  personService.create.mockRejectedValue({ response: { status: 400, data: { error: 'number must start with 2 or 3 digits' } } })
  render(<App />)
  await screen.findByText(/Ada Example 111/)
  fill('Cy Test', 'invalid')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringMatching(/number must start/))
})

test('shows the backend validation error when updating a number', async () => {
  personService.update.mockRejectedValue({ response: { status: 400, data: { error: 'number is shorter than 8 characters' } } })
  render(<App />)
  await screen.findByText(/Ada Example 111/)
  fill('Ada Example', '1-2')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringMatching(/number is shorter/))
})
