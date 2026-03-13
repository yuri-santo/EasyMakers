import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "..", "public", "assets", "data");

const defaults = {
  site: {
    hero: {
      title: "TRANSFORMAMOS TECNOLOGIA EM SOLUCOES SIMPLES, ACESSIVEIS E AUTOMATIZADAS.",
      lead: "Consultoria em TI para negocios que querem escalar com inteligencia e eficiencia.",
      ctaLabel: "Ative o modo Easy",
    },
    about: {
      title: "Sobre a EasyMakers",
      text: "Consultoria e solucoes tecnologicas para facilitar a rotina, automatizar processos e deixar a operacao mais clara.",
    },
    contact: {
      title: "Fale conosco",
      text: "Pronto para facilitar a tecnologia na sua empresa?",
      email: "contato@easymakers.com.br",
    },
  },
  community: {
    testimonials: [],
    faqs: [],
  },
  comments: [],
  projects: [],
};

const files = {
  site: "site.json",
  community: "community.json",
  comments: "comments.json",
  projects: "projects.json",
};

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

async function readJson(filename, fallback) {
  await ensureDataDir();
  const filePath = path.join(dataDir, filename);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), "utf8");
    return structuredClone(fallback);
  }
}

async function writeJson(filename, value) {
  await ensureDataDir();
  const filePath = path.join(dataDir, filename);
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
  return value;
}

export async function readSiteBundle() {
  const [site, community, comments, projects] = await Promise.all([
    readJson(files.site, defaults.site),
    readJson(files.community, defaults.community),
    readJson(files.comments, defaults.comments),
    readJson(files.projects, defaults.projects),
  ]);

  const sortedComments = [...comments].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return { site, community, comments: sortedComments, projects };
}

export async function saveSiteSettings(patch) {
  const current = await readJson(files.site, defaults.site);
  const next = {
    ...current,
    ...patch,
    hero: { ...current.hero, ...(patch.hero || {}) },
    about: { ...current.about, ...(patch.about || {}) },
    contact: { ...current.contact, ...(patch.contact || {}) },
  };
  return writeJson(files.site, next);
}

async function mutateArrayFile(filename, fallback, mutate) {
  const current = await readJson(filename, fallback);
  const next = await mutate(Array.isArray(current) ? [...current] : { ...current });
  return writeJson(filename, next);
}

function nextId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export async function createProject(payload) {
  return mutateArrayFile(files.projects, defaults.projects, async (projects) => {
    const project = {
      id: nextId("project"),
      title: payload.title,
      client: payload.client,
      category: payload.category,
      image: payload.image,
      summary: payload.summary,
      description: payload.description,
      tech: payload.tech || [],
      metrics: payload.metrics || [],
      link: payload.link || "/#contato",
    };
    projects.unshift(project);
    return projects;
  });
}

export async function updateProject(id, patch) {
  return mutateArrayFile(files.projects, defaults.projects, async (projects) => {
    const index = projects.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Project not found");
    projects[index] = { ...projects[index], ...patch, id };
    return projects;
  });
}

export async function deleteProject(id) {
  return mutateArrayFile(files.projects, defaults.projects, async (projects) => projects.filter((item) => item.id !== id));
}

async function mutateCommunity(mutator) {
  const current = await readJson(files.community, defaults.community);
  const next = await mutator({
    testimonials: [...(current.testimonials || [])],
    faqs: [...(current.faqs || [])],
  });
  return writeJson(files.community, next);
}

export async function createFaq(payload) {
  return mutateCommunity(async (community) => {
    community.faqs.unshift({
      id: nextId("faq"),
      category: payload.category,
      tags: payload.tags || [],
      question: payload.question,
      answer: payload.answer,
    });
    return community;
  });
}

export async function updateFaq(id, patch) {
  return mutateCommunity(async (community) => {
    const index = community.faqs.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("FAQ not found");
    community.faqs[index] = { ...community.faqs[index], ...patch, id };
    return community;
  });
}

export async function deleteFaq(id) {
  return mutateCommunity(async (community) => {
    community.faqs = community.faqs.filter((item) => item.id !== id);
    return community;
  });
}

export async function createTestimonial(payload) {
  return mutateCommunity(async (community) => {
    community.testimonials.unshift({
      id: nextId("testimonial"),
      name: payload.name,
      role: payload.role,
      company: payload.company,
      score: payload.score,
      quote: payload.quote,
    });
    return community;
  });
}

export async function updateTestimonial(id, patch) {
  return mutateCommunity(async (community) => {
    const index = community.testimonials.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Testimonial not found");
    community.testimonials[index] = { ...community.testimonials[index], ...patch, id };
    return community;
  });
}

export async function deleteTestimonial(id) {
  return mutateCommunity(async (community) => {
    community.testimonials = community.testimonials.filter((item) => item.id !== id);
    return community;
  });
}

export async function createComment(payload) {
  return mutateArrayFile(files.comments, defaults.comments, async (comments) => {
    const comment = {
      id: nextId("comment"),
      author: payload.author,
      company: payload.company || "",
      message: payload.message,
      createdAt: new Date().toISOString(),
    };
    comments.unshift(comment);
    return comments;
  });
}

export async function deleteComment(id) {
  return mutateArrayFile(files.comments, defaults.comments, async (comments) => comments.filter((item) => item.id !== id));
}
