import axios from 'axios'

const baseUrl = import.meta.env.VITE_API_URL || '/api/persons'
const getAll = async () => (await axios.get(baseUrl)).data
const create = async person => (await axios.post(baseUrl, person)).data
const update = async (id, person) => (await axios.put(`${baseUrl}/${id}`, person)).data
const remove = async id => (await axios.delete(`${baseUrl}/${id}`)).data

export default { getAll, create, update, remove }
