// Curated technology catalog shared by every template.
//
// Icons come from Devicon (https://devicon.dev, MIT License), pinned to a
// release so README images never change under the user. Every `devicon` path
// below was checked against devicon.json and the CDN for v2.17.0.
//
// Icons whose colors have too little contrast on GitHub's dark theme also get
// a white Simple Icons version (https://simpleicons.org, CC0-1.0) via `darkSlug`,
// shown only to readers using the dark theme. Each slug was checked on
// cdn.simpleicons.org. That CDN cannot be pinned to a version.

export const DEVICON_VERSION = "2.17.0";

/** Most technologies one list (main section or custom section) can show. */
export const MAX_TECHNOLOGIES = 40;

export const TECHNOLOGY_CATEGORIES = ["languages", "frameworks", "databases", "tools"] as const;
export type TechnologyCategory = (typeof TECHNOLOGY_CATEGORIES)[number];

export type Technology = {
  id: string;
  name: string;
  category: TechnologyCategory;
  /** "<folder>/<file>" inside Devicon's icons directory, without ".svg". */
  devicon: string;
  /** Simple Icons slug for a light version on dark backgrounds, when needed. */
  darkSlug?: string;
};

function tech(id: string, name: string, category: TechnologyCategory, variant = "original"): Technology {
  return { id, name, category, devicon: `${id}/${id}-${variant}` };
}

function withDarkIcon(technology: Technology, darkSlug: string): Technology {
  return { ...technology, darkSlug };
}

export const TECHNOLOGIES: readonly Technology[] = [
  // Languages
  tech("javascript", "JavaScript", "languages"),
  tech("typescript", "TypeScript", "languages"),
  tech("python", "Python", "languages"),
  tech("java", "Java", "languages"),
  tech("csharp", "C#", "languages"),
  tech("c", "C", "languages"),
  tech("cplusplus", "C++", "languages"),
  tech("go", "Go", "languages"),
  withDarkIcon(tech("rust", "Rust", "languages"), "rust"),
  tech("kotlin", "Kotlin", "languages"),
  tech("swift", "Swift", "languages"),
  tech("php", "PHP", "languages"),
  tech("ruby", "Ruby", "languages"),
  tech("dart", "Dart", "languages"),
  tech("scala", "Scala", "languages"),
  tech("r", "R", "languages"),
  withDarkIcon(tech("lua", "Lua", "languages"), "lua"),
  tech("elixir", "Elixir", "languages"),
  tech("haskell", "Haskell", "languages"),
  withDarkIcon(tech("bash", "Bash", "languages"), "gnubash"),
  tech("html5", "HTML", "languages"),
  tech("css3", "CSS", "languages"),
  tech("perl", "Perl", "languages"),
  tech("clojure", "Clojure", "languages"),
  tech("julia", "Julia", "languages"),
  withDarkIcon(tech("solidity", "Solidity", "languages"), "solidity"),
  tech("matlab", "MATLAB", "languages"),
  tech("groovy", "Groovy", "languages"),
  tech("fsharp", "F#", "languages"),
  tech("powershell", "PowerShell", "languages"),
  tech("sass", "Sass", "languages"),
  withDarkIcon(tech("markdown", "Markdown", "languages"), "markdown"),
  tech("objectivec", "Objective-C", "languages", "plain"),
  tech("zig", "Zig", "languages"),
  withDarkIcon(tech("erlang", "Erlang", "languages"), "erlang"),
  withDarkIcon(tech("denojs", "Deno", "languages"), "deno"),

  // Frameworks and libraries
  tech("react", "React", "frameworks"),
  withDarkIcon(tech("nextjs", "Next.js", "frameworks"), "nextdotjs"),
  tech("vuejs", "Vue.js", "frameworks"),
  tech("nuxtjs", "Nuxt", "frameworks"),
  tech("angular", "Angular", "frameworks"),
  tech("svelte", "Svelte", "frameworks"),
  tech("nodejs", "Node.js", "frameworks"),
  withDarkIcon(tech("express", "Express", "frameworks"), "express"),
  tech("nestjs", "NestJS", "frameworks"),
  withDarkIcon(tech("django", "Django", "frameworks", "plain"), "django"),
  withDarkIcon(tech("flask", "Flask", "frameworks"), "flask"),
  tech("fastapi", "FastAPI", "frameworks"),
  tech("spring", "Spring", "frameworks"),
  withDarkIcon(tech("dotnetcore", ".NET", "frameworks"), "dotnet"),
  tech("laravel", "Laravel", "frameworks"),
  tech("rails", "Ruby on Rails", "frameworks", "plain"),
  tech("flutter", "Flutter", "frameworks"),
  tech("tailwindcss", "Tailwind CSS", "frameworks"),
  tech("bootstrap", "Bootstrap", "frameworks"),
  tech("jquery", "jQuery", "frameworks"),
  tech("redux", "Redux", "frameworks"),
  tech("quarkus", "Quarkus", "frameworks"),
  tech("hibernate", "Hibernate", "frameworks"),
  tech("gatsby", "Gatsby", "frameworks"),
  withDarkIcon(tech("remix", "Remix", "frameworks"), "remix"),
  tech("astro", "Astro", "frameworks"),
  tech("solidjs", "SolidJS", "frameworks"),
  tech("electron", "Electron", "frameworks"),
  tech("ionic", "Ionic", "frameworks"),
  withDarkIcon(tech("threejs", "Three.js", "frameworks"), "threedotjs"),
  tech("materialui", "Material UI", "frameworks"),
  tech("chakraui", "Chakra UI", "frameworks"),
  withDarkIcon(tech("symfony", "Symfony", "frameworks"), "symfony"),
  tech("phoenix", "Phoenix", "frameworks"),
  tech("ktor", "Ktor", "frameworks"),
  tech("jetpackcompose", "Jetpack Compose", "frameworks"),
  withDarkIcon(tech("blazor", "Blazor", "frameworks"), "blazor"),
  tech("vuetify", "Vuetify", "frameworks"),
  tech("antdesign", "Ant Design", "frameworks"),
  tech("bulma", "Bulma", "frameworks", "plain"),
  tech("htmx", "htmx", "frameworks"),
  tech("thymeleaf", "Thymeleaf", "frameworks"),
  withDarkIcon(tech("prisma", "Prisma", "frameworks"), "prisma"),
  tech("sequelize", "Sequelize", "frameworks"),
  withDarkIcon(tech("mongoose", "Mongoose", "frameworks"), "mongoose"),
  withDarkIcon(tech("socketio", "Socket.IO", "frameworks"), "socketdotio"),
  tech("numpy", "NumPy", "frameworks"),
  tech("pandas", "pandas", "frameworks"),
  tech("tensorflow", "TensorFlow", "frameworks"),
  tech("pytorch", "PyTorch", "frameworks"),
  tech("keras", "Keras", "frameworks"),
  tech("scikitlearn", "scikit-learn", "frameworks"),
  tech("opencv", "OpenCV", "frameworks"),

  // Databases
  tech("postgresql", "PostgreSQL", "databases"),
  withDarkIcon(tech("mysql", "MySQL", "databases"), "mysql"),
  tech("mongodb", "MongoDB", "databases"),
  tech("redis", "Redis", "databases"),
  tech("sqlite", "SQLite", "databases"),
  withDarkIcon(tech("mariadb", "MariaDB", "databases"), "mariadb"),
  tech("oracle", "Oracle", "databases"),
  tech("microsoftsqlserver", "SQL Server", "databases"),
  tech("firebase", "Firebase", "databases"),
  tech("supabase", "Supabase", "databases"),
  tech("cassandra", "Cassandra", "databases"),
  tech("elasticsearch", "Elasticsearch", "databases"),
  tech("dynamodb", "DynamoDB", "databases"),
  tech("neo4j", "Neo4j", "databases"),
  tech("couchdb", "CouchDB", "databases"),
  withDarkIcon(tech("influxdb", "InfluxDB", "databases"), "influxdb"),

  // Tools and platforms
  tech("git", "Git", "tools"),
  withDarkIcon(tech("github", "GitHub", "tools"), "github"),
  tech("githubactions", "GitHub Actions", "tools"),
  tech("gitlab", "GitLab", "tools"),
  tech("docker", "Docker", "tools"),
  tech("kubernetes", "Kubernetes", "tools"),
  tech("linux", "Linux", "tools"),
  tech("ubuntu", "Ubuntu", "tools"),
  tech("vscode", "VS Code", "tools"),
  tech("intellij", "IntelliJ IDEA", "tools"),
  tech("figma", "Figma", "tools"),
  tech("postman", "Postman", "tools"),
  tech("graphql", "GraphQL", "tools", "plain"),
  tech("npm", "npm", "tools"),
  tech("yarn", "Yarn", "tools"),
  tech("vite", "Vite", "tools"),
  tech("webpack", "webpack", "tools"),
  tech("jest", "Jest", "tools", "plain"),
  tech("vitest", "Vitest", "tools"),
  tech("amazonwebservices", "AWS", "tools", "plain-wordmark"),
  tech("azure", "Azure", "tools"),
  tech("googlecloud", "Google Cloud", "tools"),
  withDarkIcon(tech("vercel", "Vercel", "tools"), "vercel"),
  tech("netlify", "Netlify", "tools"),
  tech("nginx", "NGINX", "tools"),
  tech("terraform", "Terraform", "tools"),
  tech("jira", "Jira", "tools"),
  withDarkIcon(tech("apachekafka", "Apache Kafka", "tools"), "apachekafka"),
  tech("rabbitmq", "RabbitMQ", "tools"),
  tech("apachespark", "Apache Spark", "tools"),
  tech("maven", "Maven", "tools"),
  withDarkIcon(tech("gradle", "Gradle", "tools"), "gradle"),
  tech("jenkins", "Jenkins", "tools"),
  tech("ansible", "Ansible", "tools"),
  withDarkIcon(tech("helm", "Helm", "tools"), "helm"),
  tech("argocd", "Argo CD", "tools"),
  tech("prometheus", "Prometheus", "tools"),
  tech("grafana", "Grafana", "tools"),
  tech("kibana", "Kibana", "tools"),
  tech("logstash", "Logstash", "tools"),
  tech("sonarqube", "SonarQube", "tools"),
  tech("heroku", "Heroku", "tools"),
  tech("digitalocean", "DigitalOcean", "tools"),
  tech("cloudflare", "Cloudflare", "tools"),
  tech("bitbucket", "Bitbucket", "tools"),
  tech("azuredevops", "Azure DevOps", "tools"),
  withDarkIcon(tech("circleci", "CircleCI", "tools", "plain"), "circleci"),
  tech("apache", "Apache HTTP Server", "tools"),
  tech("tomcat", "Tomcat", "tools"),
  tech("swagger", "Swagger", "tools"),
  tech("insomnia", "Insomnia", "tools"),
  tech("junit", "JUnit", "tools"),
  tech("pytest", "pytest", "tools"),
  tech("mocha", "Mocha", "tools"),
  tech("cypressio", "Cypress", "tools"),
  withDarkIcon(tech("selenium", "Selenium", "tools"), "selenium"),
  tech("playwright", "Playwright", "tools"),
  tech("storybook", "Storybook", "tools"),
  tech("babel", "Babel", "tools"),
  tech("eslint", "ESLint", "tools"),
  tech("pnpm", "pnpm", "tools"),
  tech("bun", "Bun", "tools"),
  tech("eclipse", "Eclipse", "tools"),
  tech("visualstudio", "Visual Studio", "tools"),
  tech("pycharm", "PyCharm", "tools"),
  tech("webstorm", "WebStorm", "tools"),
  tech("rider", "Rider", "tools"),
  tech("datagrip", "DataGrip", "tools"),
  tech("dbeaver", "DBeaver", "tools"),
  tech("androidstudio", "Android Studio", "tools"),
  tech("xcode", "Xcode", "tools"),
  tech("vim", "Vim", "tools"),
  tech("neovim", "Neovim", "tools"),
  tech("jupyter", "Jupyter", "tools"),
  tech("anaconda", "Anaconda", "tools"),
  tech("slack", "Slack", "tools"),
  tech("notion", "Notion", "tools"),
  tech("trello", "Trello", "tools"),
  tech("confluence", "Confluence", "tools"),
  tech("wordpress", "WordPress", "tools"),
  tech("unity", "Unity", "tools"),
  withDarkIcon(tech("unrealengine", "Unreal Engine", "tools"), "unrealengine"),
  tech("godot", "Godot", "tools"),
  tech("blender", "Blender", "tools"),
  tech("photoshop", "Photoshop", "tools"),
  tech("illustrator", "Illustrator", "tools"),
  tech("canva", "Canva", "tools"),
  tech("windows11", "Windows", "tools"),
  withDarkIcon(tech("apple", "macOS", "tools"), "apple"),
  withDarkIcon(tech("debian", "Debian", "tools"), "debian"),
  tech("fedora", "Fedora", "tools"),
  tech("archlinux", "Arch Linux", "tools"),
  tech("raspberrypi", "Raspberry Pi", "tools"),
  tech("arduino", "Arduino", "tools"),
];

const BY_ID = new Map(TECHNOLOGIES.map((technology) => [technology.id, technology]));

export function findTechnology(id: string): Technology | undefined {
  return BY_ID.get(id);
}

export function technologyIconUrl(technology: Technology): string {
  return `https://cdn.jsdelivr.net/gh/devicons/devicon@v${DEVICON_VERSION}/icons/${technology.devicon}.svg`;
}

/** White icon for dark backgrounds, or null when the regular icon already works. */
export function technologyDarkIconUrl(technology: Technology): string | null {
  return technology.darkSlug ? `https://cdn.simpleicons.org/${technology.darkSlug}/white` : null;
}
