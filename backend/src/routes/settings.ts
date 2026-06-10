import { Router } from 'express';
import { getSettingsService } from '../services';
import { asyncHandlerAny as asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// 1. GET /api/settings — 全部设置
router.get('/', asyncHandler(async (_req, res) => {
  const service = getSettingsService();
  const settings = await service.get();
  res.json({ success: true, data: settings });
}));

// 2. PUT /api/settings/:key — 更新单项
router.put('/:key', asyncHandler(async (req, res) => {
  const service = getSettingsService();
  const settings = await service.update({ [req.params.key]: req.body.value });
  res.json({ success: true, data: settings });
}));

// 3. GET /api/settings/themes — 主题列表
router.get('/themes', asyncHandler(async (_req, res) => {
  const service = getSettingsService();
  const themes = service.getThemes();
  res.json({ success: true, data: themes });
}));

// 4. PUT /api/settings/theme — 切换主题
router.put('/theme', asyncHandler(async (req, res) => {
  const { theme } = req.body;
  const service = getSettingsService();
  const settings = await service.update({ theme });
  res.json({ success: true, data: settings });
}));

// 5. GET /api/settings/languages — 语言列表
router.get('/languages', asyncHandler(async (_req, res) => {
  const service = getSettingsService();
  const languages = service.getLanguages();
  res.json({ success: true, data: languages });
}));

// 6. PUT /api/settings/language — 切换语言
router.put('/language', asyncHandler(async (req, res) => {
  const { language } = req.body;
  const service = getSettingsService();
  const settings = await service.update({ language });
  res.json({ success: true, data: settings });
}));

export default router;
