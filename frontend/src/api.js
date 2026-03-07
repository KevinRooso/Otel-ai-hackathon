import axios from 'axios'

const BASE = 'http://localhost:8000'

export const checkHealth = () => axios.get(`${BASE}/health`)

export const fetchBriefing = (apiKey) =>
  axios.post(`${BASE}/briefing`, { api_key: apiKey })

export const sendChat = (message, apiKey, history) =>
  axios.post(`${BASE}/chat`, { message, api_key: apiKey, history })

export const getMemory = () => axios.get(`${BASE}/memory`)

export const clearMemory = () => axios.delete(`${BASE}/memory`)
