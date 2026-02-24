import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { createGiftOrderSchema } from "../shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  function getMerchantToken(req: Request): string | null {
    const auth = req.header("authorization");
    if (auth && auth.toLowerCase().startsWith("bearer ")) {
      return auth.slice(7);
    }
    const alt = req.header("x-merchant-token");
    return alt || null;
  }

  async function requireMerchant(req: Request, res: Response) {
    const token = getMerchantToken(req);
    if (!token) {
      res.status(401).json({ error: "Merchant auth required" });
      return null;
    }
    const user = await storage.getMerchantUserByToken(token);
    if (!user) {
      res.status(401).json({ error: "Invalid merchant session" });
      return null;
    }
    return user;
  }

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

  app.post("/api/merchant/login", async (req: Request, res: Response) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const user = await storage.authenticateMerchant(email, password);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = await storage.createMerchantSession(user);
    res.json({ token, user });
  });

  app.get("/api/merchant/orders", async (req: Request, res: Response) => {
    const user = await requireMerchant(req, res);
    if (!user) return;
    const orders = await storage.getOrdersByMerchant(user.merchantId);
    res.json(orders);
  });

  app.get("/api/merchant/orders/:id", async (req: Request, res: Response) => {
    const user = await requireMerchant(req, res);
    if (!user) return;
    const order = await storage.getOrder(req.params.id);
    if (!order || order.merchantId !== user.merchantId) {
      return res.status(404).json({ error: "Order not found" });
    }
    const redemptions = await storage.getCreditRedemptions(order.id);
    res.json({ order, redemptions });
  });

  app.get("/api/merchant/orders/by-code/:code", async (req: Request, res: Response) => {
    const user = await requireMerchant(req, res);
    if (!user) return;
    const order = await storage.findOrderByRedeemCode(req.params.code);
    if (!order || order.merchantId !== user.merchantId) {
      return res.status(404).json({ error: "Order not found" });
    }
    const redemptions = await storage.getCreditRedemptions(order.id);
    res.json({ order, redemptions });
  });

  app.post("/api/merchant/redeem/item", async (req: Request, res: Response) => {
    const user = await requireMerchant(req, res);
    if (!user) return;
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: "Code required" });
    const order = await storage.findOrderByRedeemCode(code);
    if (!order || order.merchantId !== user.merchantId) {
      return res.status(404).json({ error: "Order not found" });
    }
    const updated = await storage.redeemItemOrder(code, user.id);
    if (!updated) {
      return res.status(400).json({ error: "Invalid, expired, or already redeemed code" });
    }
    res.json(updated);
  });

  app.post("/api/merchant/redeem/credit", async (req: Request, res: Response) => {
    const user = await requireMerchant(req, res);
    if (!user) return;
    const { code, amountToDeduct } = req.body || {};
    const parsedAmount = Number(amountToDeduct);
    if (!code) return res.status(400).json({ error: "Code required" });
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ error: "amountToDeduct must be positive" });
    }
    const order = await storage.findOrderByRedeemCode(code);
    if (!order || order.merchantId !== user.merchantId) {
      return res.status(404).json({ error: "Order not found" });
    }
    const result = await storage.redeemCreditOrder(code, parsedAmount, user.id);
    if (!result) {
      return res.status(400).json({ error: "Invalid, expired, or insufficient balance" });
    }
    res.json(result);
  });

  app.post("/api/redeem", async (req: Request, res: Response) => {
    const user = await requireMerchant(req, res);
    if (!user) return;
    const { code, amountToDeduct } = req.body || {};
    const parsedAmount = Number(amountToDeduct);
    if (!code) return res.status(400).json({ error: "Code required" });
    const order = await storage.findOrderByRedeemCode(code);
    if (!order || order.merchantId !== user.merchantId) {
      return res.status(404).json({ error: "Order not found" });
    }
    if (order.giftType === "CREDIT") {
      if (!parsedAmount || parsedAmount <= 0) {
        return res.status(400).json({ error: "amountToDeduct must be positive" });
      }
      const result = await storage.redeemCreditOrder(code, parsedAmount, user.id);
      if (!result) {
        return res.status(400).json({ error: "Invalid, expired, or insufficient balance" });
      }
      return res.json(result);
    }
    const updated = await storage.redeemItemOrder(code, user.id);
    if (!updated) {
      return res.status(400).json({ error: "Invalid, expired, or already redeemed code" });
    }
    return res.json(updated);
  });

  const httpServer = createServer(app);
  return httpServer;
}
