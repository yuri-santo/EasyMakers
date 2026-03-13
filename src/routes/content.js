import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import {
  readSiteBundle,
  saveSiteSettings,
  createProject,
  updateProject,
  deleteProject,
  createFaq,
  updateFaq,
  deleteFaq,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  createComment,
  deleteComment,
} from "../services/contentStore.js";

const categorySchema = z.enum(["apps", "automation", "bi", "mobile"]);

const projectBody = z.object({
  title: z.string().trim().min(1).max(120),
  client: z.string().trim().min(1).max(120),
  category: categorySchema,
  image: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(220),
  description: z.string().trim().min(1).max(1200),
  tech: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  metrics: z.array(z.string().trim().min(1).max(140)).max(8).default([]),
  link: z.string().trim().max(200).default("/#contato"),
});

const faqBody = z.object({
  category: z.string().trim().min(1).max(40),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
  question: z.string().trim().min(1).max(160),
  answer: z.string().trim().min(1).max(1200),
});

const testimonialBody = z.object({
  name: z.string().trim().min(1).max(80),
  role: z.string().trim().min(1).max(80),
  company: z.string().trim().min(1).max(80),
  score: z.string().trim().min(1).max(40),
  quote: z.string().trim().min(1).max(500),
});

const siteBody = z.object({
  hero: z.object({
    title: z.string().trim().min(1).max(180),
    lead: z.string().trim().min(1).max(280),
    ctaLabel: z.string().trim().min(1).max(40),
  }),
  about: z.object({
    title: z.string().trim().min(1).max(120),
    text: z.string().trim().min(1).max(300),
  }),
  contact: z.object({
    title: z.string().trim().min(1).max(120),
    text: z.string().trim().min(1).max(220),
    email: z.string().trim().email().max(120),
  }),
});

const commentBody = z.object({
  author: z.string().trim().min(2).max(80),
  company: z.string().trim().max(80).optional().default(""),
  message: z.string().trim().min(8).max(600),
});

function handleError(res, error) {
  const message = error instanceof Error ? error.message : "Internal error";
  return res.status(400).json({ error: message });
}

export const publicContentRouter = Router();
export const adminContentRouter = Router();

publicContentRouter.get("/site", async (_req, res) => {
  try {
    res.json(await readSiteBundle());
  } catch (error) {
    handleError(res, error);
  }
});

publicContentRouter.post("/comments", validate(z.object({ body: commentBody })), async (req, res) => {
  try {
    await createComment(req.body);
    const bundle = await readSiteBundle();
    res.status(201).json(bundle.comments);
  } catch (error) {
    handleError(res, error);
  }
});

adminContentRouter.get("/", async (_req, res) => {
  try {
    res.json(await readSiteBundle());
  } catch (error) {
    handleError(res, error);
  }
});

adminContentRouter.put("/site", validate(z.object({ body: siteBody })), async (req, res) => {
  try {
    res.json(await saveSiteSettings(req.body));
  } catch (error) {
    handleError(res, error);
  }
});

adminContentRouter.post("/projects", validate(z.object({ body: projectBody })), async (req, res) => {
  try {
    res.status(201).json(await createProject(req.body));
  } catch (error) {
    handleError(res, error);
  }
});

adminContentRouter.patch(
  "/projects/:id",
  validate(z.object({ params: z.object({ id: z.string().min(1) }), body: projectBody.partial() })),
  async (req, res) => {
    try {
      res.json(await updateProject(req.params.id, req.body));
    } catch (error) {
      handleError(res, error);
    }
  }
);

adminContentRouter.delete("/projects/:id", async (req, res) => {
  try {
    res.json(await deleteProject(req.params.id));
  } catch (error) {
    handleError(res, error);
  }
});

adminContentRouter.post("/faqs", validate(z.object({ body: faqBody })), async (req, res) => {
  try {
    res.status(201).json(await createFaq(req.body));
  } catch (error) {
    handleError(res, error);
  }
});

adminContentRouter.patch(
  "/faqs/:id",
  validate(z.object({ params: z.object({ id: z.string().min(1) }), body: faqBody.partial() })),
  async (req, res) => {
    try {
      res.json(await updateFaq(req.params.id, req.body));
    } catch (error) {
      handleError(res, error);
    }
  }
);

adminContentRouter.delete("/faqs/:id", async (req, res) => {
  try {
    res.json(await deleteFaq(req.params.id));
  } catch (error) {
    handleError(res, error);
  }
});

adminContentRouter.post("/testimonials", validate(z.object({ body: testimonialBody })), async (req, res) => {
  try {
    res.status(201).json(await createTestimonial(req.body));
  } catch (error) {
    handleError(res, error);
  }
});

adminContentRouter.patch(
  "/testimonials/:id",
  validate(z.object({ params: z.object({ id: z.string().min(1) }), body: testimonialBody.partial() })),
  async (req, res) => {
    try {
      res.json(await updateTestimonial(req.params.id, req.body));
    } catch (error) {
      handleError(res, error);
    }
  }
);

adminContentRouter.delete("/testimonials/:id", async (req, res) => {
  try {
    res.json(await deleteTestimonial(req.params.id));
  } catch (error) {
    handleError(res, error);
  }
});

adminContentRouter.delete("/comments/:id", async (req, res) => {
  try {
    res.json(await deleteComment(req.params.id));
  } catch (error) {
    handleError(res, error);
  }
});
