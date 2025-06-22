import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const configPath = path.join(__dirname, '../config.json');
const packageJsonPath = path.join(__dirname, '../../package.json');
const uploadsPath = path.join(process.cwd(), '../uploads');

interface Config {
  general: {
    darkModeEnabled: boolean;
  };
  upload: {
    defaultExpirationEnabled: boolean;
    defaultExpiration: string;
    autoCopyLinks: boolean;
  };
  display: {
    showFileSize: boolean;
  };
  server: {
    domain: string;
  };
}

interface SystemInfo {
  version: string;
  storageUsed: string;
  totalFiles: number;
}

const defaultConfig: Config = {
  general: {
    darkModeEnabled: false
  },
  upload: {
    defaultExpirationEnabled: false,
    defaultExpiration: '1h',
    autoCopyLinks: true
  },
  display: {
    showFileSize: true
  },
  server: {
    domain: 'https://play.maple.music'
  }
};

function readConfig(): Config {
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    }
    
    console.log('Config file not found, creating default config...');
    writeConfig(defaultConfig);
    return defaultConfig;
  } catch (error) {
    console.error('Error reading config:', error);
    return defaultConfig;
  }
}

function writeConfig(config: Config): boolean {
  try {
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing config:', error);
    return false;
  }
}

function getDirectorySize(dirPath: string): number {
  let totalSize = 0;
  
  try {
    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        totalSize += getDirectorySize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    console.error('Error calculating directory size:', error);
  }
  
  return totalSize;
}

function countFiles(dirPath: string): number {
  let fileCount = 0;
  
  try {
    if (!fs.existsSync(dirPath)) {
      return 0;
    }

    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        fileCount += countFiles(itemPath);
      } else {
        fileCount++;
      }
    }
  } catch (error) {
    console.error('Error counting files:', error);
  }
  
  return fileCount;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getSystemInfo(): SystemInfo {
  try {
    let version = '1.0.0';
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      version = packageJson.version || '1.0.0';
    } catch (error) {
      console.error('Error reading package.json:', error);
    }

    const totalBytes = getDirectorySize(uploadsPath);
    const storageUsed = formatBytes(totalBytes);

    const totalFiles = countFiles(uploadsPath);

    return {
      version,
      storageUsed,
      totalFiles
    };
  } catch (error) {
    console.error('Error getting system info:', error);
    return {
      version: '1.0.0',
      storageUsed: '0 B',
      totalFiles: 0
    };
  }
}

export const getConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const config = readConfig();
    const systemInfo = getSystemInfo();
    
    res.json({
      ...config,
      system: systemInfo
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
};

export const updateConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const updatedConfig: Config = req.body;
    
    if (!updatedConfig.general || !updatedConfig.upload || !updatedConfig.display || !updatedConfig.server) {
      res.status(400).json({ error: 'Invalid configuration structure' });
      return;
    }

    const success = writeConfig(updatedConfig);
    
    if (success) {
      res.json({ message: 'Configuration updated successfully', config: updatedConfig });
    } else {
      res.status(500).json({ error: 'Failed to save configuration' });
    }
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
};
