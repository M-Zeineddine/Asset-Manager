import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { createGiftOrderSchema } from "../shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/merchants", async (req: Request, res: Response) => {
    const { city, category } = req.query;
    const merchants = await storage.getMerchants(
      city as string | undefined,
      category as string | undefined
    );
    res.json(merchants);
  });

  app.get("/api/merchants/:id", async (req: Request, res: Response) => {
    const merchant = await storage.getMerchant(req.params.id);
    if (!merchant) return res.status(404).json({ error: "Merchant not found" });
    res.json(merchant);
  });

  app.get("/api/merchants/:id/products", async (req: Request, res: Response) => {
    const products = await storage.getProducts(req.params.id);
    res.json(products);
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    const product = await storage.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  });

  app.get("/api/products", async (req: Request, res: Response) => {
    const { category } = req.query;
    if (category) {
      const products = await storage.getProductsByCategory(category as string);
      res.json(products);
    } else {
      const merchants = await storage.getMerchants();
      const allProducts = [];
      for (const m of merchants) {
        const prods = await storage.getProducts(m.id);
        allProducts.push(...prods);
      }
      res.json(allProducts);
    }
  });

  app.post("/api/orders", async (req: Request, res: Response) => {
    const parsed = createGiftOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    try {
      const order = await storage.createOrder(parsed.data);
      res.status(201).json(order);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    const { t } = req.query;
    if (!t) return res.status(400).json({ error: "Token required" });
    const order = await storage.getOrderByToken(req.params.id, t as string);
    if (!order) return res.status(404).json({ error: "Gift not found" });
    res.json(order);
  });

  app.post("/api/redeem", async (req: Request, res: Response) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Code required" });
    const order = await storage.redeemOrder(code);
    if (!order) {
      return res.status(400).json({ error: "Invalid, expired, or already redeemed code" });
    }
    res.json(order);
  });

  const httpServer = createServer(app);
  return httpServer;
}
