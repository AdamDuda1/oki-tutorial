OKI-tutorial!

## For horizons:
This is an website proposal for OKI's (Polish *olympiad-oriented computer science club*) tutorial, a website that collects all the materials created by and used by OKI in a nice course format :))

### is live on: https://kurs.oki.org.pl

### Features:
 * AdonisJS MVC structure 
 * Alpine.js for interactive components
 * Responsive mobile version
 * Everything editable in the admin panel, almost nothing is hard-coded
 * User authentication for admins
 * Task list with 
 * Materials tab that combines YT tutorials, external materials, custom HTML for each topic and tasks from the task list with different difficulties
 * Custom html components in content rendered on the server

### Installation

Requirements:
* Node (version compatible with adonis in `package.json`)
* npm to install all dependencies
* MySQL (PostgreSQL should work too but i haven't tested it, just edit .env) or SQLite3 for dev

After cloning the repo:
```
npm install # to install deps
cp .env.example .env # Modify it for your needs
node ace generate:key
node ace migration:run
npm run dev # starts the dev server
```

### Structure

```
Most important folders:
app/          # models and controllers
config/       # add new middleware refs and stuff
database/     # migrations, please keep the naming format as is
resources/    # views (Edge) / frontend
start/        # routing, kernel
```

### Screenshots

<img width="1919" height="945" alt="image" src="https://github.com/user-attachments/assets/490029e3-202c-46a6-92e3-010d3077f42d" />

<img width="1919" height="941" alt="image" src="https://github.com/user-attachments/assets/a58884e6-a18d-4643-91d2-8e6e0a5ba768" />

<img width="1919" height="942" alt="image" src="https://github.com/user-attachments/assets/fdebf0f7-1fdf-4383-970e-74f136338cdf" />

### AI declaration 

No AI was used to generate code for the submission. I fixed some bugs with AI after, this time was not logged.
