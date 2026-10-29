# Phonebook frontend served by the Part 3 backend

This is a copy of the Part 2 Phonebook at commit `13b507d`, integrated with the Part 3 API. The Axios service uses `/api/persons`. In development, Vite proxies `/api` to `http://localhost:3001` by default. Set `VITE_BACKEND_URL=http://localhost:3002` if the backend runs on another port. Do not use `VITE_API_URL` for production unless the API is intentionally hosted on another origin.

From the parent backend directory, `npm run demo` starts the server with a fresh temporary database; `npm run deploy:build` creates the production frontend in the parent's `dist/`. To run the frontend development server, use `npm run dev` here. This copy adds backend validation messages to the Add and Update flows. The original Part 2 app remains separate.
