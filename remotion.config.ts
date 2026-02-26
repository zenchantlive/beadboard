import { Config } from '@remotion/cli/config';
import { enableTailwind } from '@remotion/tailwind';

Config.setVideoImageFormat('jpeg');

Config.overrideWebpackConfig((config) => {
  return enableTailwind(config);
});
