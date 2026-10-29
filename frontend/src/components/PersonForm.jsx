export default function PersonForm({ name, number, onNameChange, onNumberChange, onSubmit, disabled }) {
  return <form onSubmit={onSubmit}>
    <div><label>Name <input value={name} onChange={onNameChange} required /></label></div>
    <div><label>Number <input value={number} onChange={onNumberChange} required /></label></div>
    <button type="submit" disabled={disabled}>Add</button>
  </form>
}
