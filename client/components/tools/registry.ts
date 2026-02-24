/**
 * Tool Component Registry
 *
 * Maps component names from pSEO tool configurations to their React components.
 * Used by [slug].astro to dynamically render the appropriate tool.
 */

import type { ComponentType } from 'react';
import { KeywordDensityTool } from './KeywordDensityTool';
import { MetaDescriptionTool } from './MetaDescriptionTool';
import { TitleTagTool } from './TitleTagTool';
import { SeoRoiCalculator } from './SeoRoiCalculator';
import { ReadingLevelChecker } from './ReadingLevelChecker';
import { ContentLengthAnalyzer } from './ContentLengthAnalyzer';
import { BlogKeywordGeneratorTool } from './BlogKeywordGeneratorTool';
import { SeoTitleGeneratorTool } from './SeoTitleGeneratorTool';
import { ContentBriefGeneratorTool } from './ContentBriefGeneratorTool';

export const toolRegistry: Record<string, ComponentType<{ className?: string }>> = {
  KeywordDensityTool,
  MetaDescriptionTool,
  TitleTagTool,
  SeoRoiCalculator,
  ReadingLevelChecker,
  ContentLengthAnalyzer,
  BlogKeywordGeneratorTool,
  SeoTitleGeneratorTool,
  ContentBriefGeneratorTool,
};
