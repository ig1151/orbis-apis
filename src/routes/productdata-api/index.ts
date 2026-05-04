import { Router } from 'express';
import extractProductRouter      from './routes/extract-product';
import extractBatchRouter        from './routes/extract-batch';
import normalizeProductRouter    from './routes/normalize-product';
import compareProductsRouter     from './routes/compare-products';
import scoreListingQualityRouter from './routes/score-listing-quality';
import detectPriceChangeRouter   from './routes/detect-price-change';
import monitorProductRouter      from './routes/monitor-product';
import summarizeProductRouter    from './routes/summarize-product';
import executionGateRouter       from './routes/execution-gate';

const router = Router();

router.use('/extract-product',       extractProductRouter);
router.use('/extract-batch',         extractBatchRouter);
router.use('/normalize-product',     normalizeProductRouter);
router.use('/compare-products',      compareProductsRouter);
router.use('/score-listing-quality', scoreListingQualityRouter);
router.use('/detect-price-change',   detectPriceChangeRouter);
router.use('/monitor-product',       monitorProductRouter);
router.use('/summarize-product',     summarizeProductRouter);
router.use('/execution-gate',        executionGateRouter);

export default router;
