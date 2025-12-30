import Images from "../assets";

// src/data/projects.ts
export interface Project {
  id: number;
  title: string;
  description: string;
  image: string;
  tags: string[];
  link: string;
}

export const projects: Project[] = [
  {
    id: 1,
    title: "Landing Page para empresas",
    description:
      "Cursos Marinos es una plataforma de aprendizaje en línea que ofrece cursos basicos y avanzados sobre navegación y seguridad marítima.",
    image: Images.cursosmarinos || "/placeholder.svg?height=600&width=800",
    tags: ["Astro", "Tailwind"],
    link: "https://cmarinos.vercel.app/es/",
  },
  {
    id: 2,
    title: "Blog Page",
    description:
      "Pagina de blog con un diseño limpio y moderno, ideal para compartir contenido y artículos.",
    image: Images.blogpage || "/placeholder.svg?height=600&width=800",
    tags: ["Astro", "Tailwind"],
    link: "https://blogtemplate-three.vercel.app/",
  },
  // {
  //   id: 3,
  //   title: "Sistema de Gestión de Inventario",
  //   description:
  //     "Sistema de gestión de inventario para pequeñas y medianas empresas, con funcionalidades de seguimiento de productos y reportes.",
  //     image: Images.blogpage || "/placeholder.svg?height=600&width=800",
  //   tags: ["Vite.js", "Node", "Tailwind CSS"],
  //   link: "#",
  // },
  // {
  //   id: 4,
  //   title: "Sistema de Gestión de Certificados parar cursos",
  //   description:
  //     "Sistema de gestión de inventario para pequeñas y medianas empresas, con funcionalidades de seguimiento de productos y reportes.",
  //   image: Images.blogpage || "/placeholder.svg?height=600&width=800",
  //   tags: ["Next.js", "Stripe", "Tailwind CSS"],
  //   link: "#",
  // },
];
