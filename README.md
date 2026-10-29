# Full Stack Open Part 3 — Phonebook backend

This is the final MongoDB-backed form of the Part 3 Phonebook server. It uses Express, Mongoose, Morgan, CORS, and the Part 2 Phonebook frontend copied under `frontend/`. The final app serves the compiled frontend from `dist/`. Earlier exercises that used hardcoded or in-memory data are represented by the evolved MongoDB implementation.

## Local use

Node 24 is required. From this directory:

```sh
npm ci
npm test
npm run lint
npm run demo
```

`npm run demo` starts a **fresh, temporary, nonpersistent MongoDB** and the API at `http://localhost:3001`. Stopping the process removes this database. It never connects to an existing database. It is useful for independent verification without Atlas. If `dist/` has been generated, the frontend is also available at that address.

For a persistent database, copy `.env.example` to `.env`, replace the placeholder `MONGODB_URI` with your private URI, then run `npm start` or `npm run dev` for automatic restart. Never commit `.env`. Set `PORT` if 3001 is occupied. The frontend's development server runs with `npm --prefix frontend run dev` and proxies `/api` to port 3001. For production assets, run `npm run deploy:build`. This installs frontend dependencies, builds Vite, and copies its output into `dist/` for Express to serve.

## API

- `GET /api/persons` lists MongoDB records.
- `GET /api/persons/:id` reads one record.
- `POST /api/persons` creates `{ "name": "Ada", "number": "12-345678" }`.
- `PUT /api/persons/:id` replaces name and number.
- `DELETE /api/persons/:id` deletes a record.
- `GET /info` reports the current MongoDB count and request time.

Responses use `id` rather than MongoDB's `_id`. Missing, duplicate, and invalid fields return 400; malformed IDs return 400; absent records return 404. Names require at least three characters. Numbers require at least eight characters and the form `NN-NNN...` or `NNN-NNN...`. Morgan records requests and POST bodies, as required by exercise 3.8. Use synthetic data in local demonstrations and consider the sensitivity of request logs in production.

## `mongo.js` CLI

For Atlas, provide `MONGODB_HOST`, `MONGODB_USER`, and `MONGODB_DATABASE` through your private environment. Pass the password as a command-line argument, as in the course exercise:

```sh
node mongo.js '<password>'
node mongo.js '<password>' 'Ada Lovelace' '12-345678'
```

The CLI accepts a direct `MONGODB_URI` instead for a local temporary database; in that mode the required password argument is unused. It does not print the URI or password. Command-line arguments may be visible to other local processes, so do not use a shared machine for a real password.

## Deployment preparation

The `Dockerfile` builds the frontend and runs the backend with Node 24. `render.yaml` provides a free Render web-service blueprint. Set the private `MONGODB_URI` environment variable on the host; the server reads the host-provided `PORT`. Deploy only this backend directory as the repository root, with the copied `frontend/` source included. No cloud account, Atlas cluster, public URL, or live deployment is included in this repository.

For Vercel, import this backend directory as an Express project with Node 24 and leave the output-directory override unset. `vercel.json` selects `npm run build:vercel`, which builds the frontend into both `dist/` for local/Docker use and `public/` for Vercel's static hosting. Configure the private `MONGODB_URI` runtime variable; leave `VITE_API_URL` unset for same-origin API requests. The exported Express app initializes MongoDB and its unique-name index before handling `/api` or `/info` requests, reuses that initialization, and returns a generic 503 if setup fails so a later request can retry. Public deployment and live verification remain separate steps.

## Exercise status

| Exercise | Local status |
| --- | --- |
| 3.1–3.8 | Final server routes, request logging, POST body logging implemented and tested where applicable; earlier in-memory stages are superseded. |
| 3.9 | Copied Part 2 frontend connected to `/api/persons`; adding a contact and loading it again after a browser reload verified against temporary local MongoDB. |
| 3.10 | Pending public deployment and live API check. |
| 3.11 | Local production build served by Express; pending live deployed check. |
| 3.12 | CLI verified against temporary MongoDB; pending Atlas account, cluster, and connection. |
| 3.13–3.18 | MongoDB CRUD, update, info, and error middleware verified locally. |
| 3.19–3.20 | Mongoose validation and frontend error display verified locally. |
| 3.21 | Local production assets, API, component tests, and browser create/reload flow verified; cloud rebuild and live deployed check pending. |
| 3.22 | ESLint configured and checked. |

This implementation was prepared with AI assistance. The learner must review the exercises, create or authorize the required accounts and deployment, verify the live application, push the final code to GitHub, and decide what to submit in the course app. No exercise submission or certificate claim is made here.

Course sources: [Node.js and Express](https://fullstackopen.com/en/part3/node_js_and_express/), [Deploying app to internet](https://fullstackopen.com/en/part3/deploying_app_to_internet/), [Saving data to MongoDB](https://fullstackopen.com/en/part3/saving_data_to_mongo_db/), [Validation and ESLint](https://fullstackopen.com/en/part3/validation_and_es_lint/).
