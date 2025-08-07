const { create } = require('ipfs-http-client');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

class IPFSService {
  constructor() {
    this.client = null;
    this.gatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://gateway.ipfs.io/ipfs/';
    this.initialize();
  }

  initialize() {
    try {
      const host = process.env.IPFS_HOST || '127.0.0.1';
      const port = process.env.IPFS_PORT || 5001;
      const protocol = process.env.IPFS_PROTOCOL || 'http';

      this.client = create({
        host,
        port,
        protocol,
      });

      logger.info(`IPFS client initialized: ${protocol}://${host}:${port}`);
    } catch (error) {
      logger.error('Failed to initialize IPFS client:', error);
      // Don't throw error here to allow app to start even if IPFS is not available
    }
  }

  async isConnected() {
    try {
      if (!this.client) return false;
      
      const id = await this.client.id();
      return !!id;
    } catch (error) {
      logger.warn('IPFS connection check failed:', error.message);
      return false;
    }
  }

  async uploadFile(filePath, options = {}) {
    try {
      if (!this.client) {
        throw new Error('IPFS client not initialized');
      }

      const isConnected = await this.isConnected();
      if (!isConnected) {
        throw new Error('IPFS node is not accessible');
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);

      const result = await this.client.add({
        path: fileName,
        content: fileBuffer,
      }, {
        pin: options.pin !== false, // Pin by default
        wrapWithDirectory: options.wrapWithDirectory || false,
        ...options,
      });

      const hash = result.cid.toString();
      
      logger.info(`File uploaded to IPFS: ${fileName} -> ${hash}`);
      
      return {
        hash,
        fileName,
        size: result.size,
        url: this.getGatewayUrl(hash),
      };
    } catch (error) {
      logger.error('Failed to upload file to IPFS:', error);
      throw error;
    }
  }

  async uploadBuffer(buffer, fileName, options = {}) {
    try {
      if (!this.client) {
        throw new Error('IPFS client not initialized');
      }

      const isConnected = await this.isConnected();
      if (!isConnected) {
        throw new Error('IPFS node is not accessible');
      }

      const result = await this.client.add({
        path: fileName,
        content: buffer,
      }, {
        pin: options.pin !== false,
        wrapWithDirectory: options.wrapWithDirectory || false,
        ...options,
      });

      const hash = result.cid.toString();
      
      logger.info(`Buffer uploaded to IPFS: ${fileName} -> ${hash}`);
      
      return {
        hash,
        fileName,
        size: result.size,
        url: this.getGatewayUrl(hash),
      };
    } catch (error) {
      logger.error('Failed to upload buffer to IPFS:', error);
      throw error;
    }
  }

  async uploadJSON(data, fileName = 'data.json', options = {}) {
    try {
      if (!this.client) {
        throw new Error('IPFS client not initialized');
      }

      const isConnected = await this.isConnected();
      if (!isConnected) {
        throw new Error('IPFS node is not accessible');
      }

      const jsonString = JSON.stringify(data, null, 2);
      const buffer = Buffer.from(jsonString, 'utf8');

      const result = await this.client.add({
        path: fileName,
        content: buffer,
      }, {
        pin: options.pin !== false,
        wrapWithDirectory: options.wrapWithDirectory || false,
        ...options,
      });

      const hash = result.cid.toString();
      
      logger.info(`JSON data uploaded to IPFS: ${fileName} -> ${hash}`);
      
      return {
        hash,
        fileName,
        size: result.size,
        url: this.getGatewayUrl(hash),
        data,
      };
    } catch (error) {
      logger.error('Failed to upload JSON to IPFS:', error);
      throw error;
    }
  }

  async uploadMultipleFiles(files, options = {}) {
    try {
      if (!this.client) {
        throw new Error('IPFS client not initialized');
      }

      const isConnected = await this.isConnected();
      if (!isConnected) {
        throw new Error('IPFS node is not accessible');
      }

      const fileObjects = [];
      
      for (const file of files) {
        if (file.buffer) {
          // File from multer upload
          fileObjects.push({
            path: file.originalname,
            content: file.buffer,
          });
        } else if (file.path) {
          // File path
          const fileBuffer = fs.readFileSync(file.path);
          fileObjects.push({
            path: path.basename(file.path),
            content: fileBuffer,
          });
        }
      }

      const results = [];
      for await (const result of this.client.addAll(fileObjects, {
        pin: options.pin !== false,
        wrapWithDirectory: options.wrapWithDirectory || true,
        ...options,
      })) {
        const hash = result.cid.toString();
        results.push({
          hash,
          path: result.path,
          size: result.size,
          url: this.getGatewayUrl(hash),
        });
      }

      logger.info(`Uploaded ${results.length} files to IPFS`);
      return results;
    } catch (error) {
      logger.error('Failed to upload multiple files to IPFS:', error);
      throw error;
    }
  }

  async getFile(hash) {
    try {
      if (!this.client) {
        throw new Error('IPFS client not initialized');
      }

      const isConnected = await this.isConnected();
      if (!isConnected) {
        throw new Error('IPFS node is not accessible');
      }

      const chunks = [];
      for await (const chunk of this.client.cat(hash)) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      
      logger.info(`Retrieved file from IPFS: ${hash}`);
      return buffer;
    } catch (error) {
      logger.error(`Failed to get file from IPFS (${hash}):`, error);
      throw error;
    }
  }

  async getJSON(hash) {
    try {
      const buffer = await this.getFile(hash);
      const jsonString = buffer.toString('utf8');
      const data = JSON.parse(jsonString);
      
      logger.info(`Retrieved JSON from IPFS: ${hash}`);
      return data;
    } catch (error) {
      logger.error(`Failed to get JSON from IPFS (${hash}):`, error);
      throw error;
    }
  }

  async pinFile(hash) {
    try {
      if (!this.client) {
        throw new Error('IPFS client not initialized');
      }

      const isConnected = await this.isConnected();
      if (!isConnected) {
        throw new Error('IPFS node is not accessible');
      }

      await this.client.pin.add(hash);
      logger.info(`File pinned to IPFS: ${hash}`);
      return true;
    } catch (error) {
      logger.error(`Failed to pin file to IPFS (${hash}):`, error);
      throw error;
    }
  }

  async unpinFile(hash) {
    try {
      if (!this.client) {
        throw new Error('IPFS client not initialized');
      }

      const isConnected = await this.isConnected();
      if (!isConnected) {
        throw new Error('IPFS node is not accessible');
      }

      await this.client.pin.rm(hash);
      logger.info(`File unpinned from IPFS: ${hash}`);
      return true;
    } catch (error) {
      logger.error(`Failed to unpin file from IPFS (${hash}):`, error);
      throw error;
    }
  }

  async listPinnedFiles() {
    try {
      if (!this.client) {
        throw new Error('IPFS client not initialized');
      }

      const isConnected = await this.isConnected();
      if (!isConnected) {
        throw new Error('IPFS node is not accessible');
      }

      const pinnedFiles = [];
      for await (const pin of this.client.pin.ls()) {
        pinnedFiles.push({
          hash: pin.cid.toString(),
          type: pin.type,
        });
      }

      return pinnedFiles;
    } catch (error) {
      logger.error('Failed to list pinned files:', error);
      throw error;
    }
  }

  getGatewayUrl(hash) {
    return `${this.gatewayUrl}${hash}`;
  }

  async getNodeInfo() {
    try {
      if (!this.client) {
        throw new Error('IPFS client not initialized');
      }

      const isConnected = await this.isConnected();
      if (!isConnected) {
        throw new Error('IPFS node is not accessible');
      }

      const id = await this.client.id();
      const version = await this.client.version();
      
      return {
        id: id.id,
        publicKey: id.publicKey,
        addresses: id.addresses,
        version: version.version,
        commit: version.commit,
        repo: version.repo,
      };
    } catch (error) {
      logger.error('Failed to get IPFS node info:', error);
      throw error;
    }
  }

  // Utility method to validate IPFS hash
  static isValidHash(hash) {
    // Basic validation for IPFS hash format
    return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^baf[0-9a-z]{56}$/.test(hash);
  }

  // Method to create metadata object for blockchain storage
  createMetadata(fileInfo, additionalData = {}) {
    return {
      hash: fileInfo.hash,
      fileName: fileInfo.fileName,
      size: fileInfo.size,
      uploadedAt: new Date().toISOString(),
      gatewayUrl: fileInfo.url,
      ...additionalData,
    };
  }
}

// Create singleton instance
const ipfsService = new IPFSService();

module.exports = ipfsService;