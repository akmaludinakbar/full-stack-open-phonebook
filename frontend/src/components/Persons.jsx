export default function Persons({ persons, onDelete }) {
  return <ul>{persons.map(person => <li key={person.id}>
    {person.name} {person.number} <button type="button" aria-label={`Delete ${person.name}`} onClick={() => onDelete(person)}>delete</button>
  </li>)}</ul>
}
