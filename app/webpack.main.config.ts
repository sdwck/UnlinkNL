import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';
import CopyWebpackPlugin from 'copy-webpack-plugin';

export const mainConfig: Configuration = {
  entry: './src/main/index.ts',
  module: {
    rules,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'icon.ico',
          to: '.',
        },
      ],
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
};
