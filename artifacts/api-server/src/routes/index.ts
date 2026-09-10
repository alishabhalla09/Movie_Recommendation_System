import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import itemsRouter from "./items";
import searchRouter from "./search";
import recommendationsRouter from "./recommendations";
import interactionsRouter from "./interactions";
import watchlistRouter from "./watchlist";
import watchProgressRouter from "./watchProgress";
import reviewsRouter from "./reviews";
import adminRouter from "./admin";
import imagesRouter from "./images";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(itemsRouter);
router.use(searchRouter);
router.use(recommendationsRouter);
router.use(interactionsRouter);
router.use(watchlistRouter);
router.use(watchProgressRouter);
router.use(reviewsRouter);
router.use(adminRouter);
router.use(imagesRouter);

export default router;
