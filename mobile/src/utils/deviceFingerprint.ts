import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from './constants';

// Generate or retrieve a persistent device fingerprint
export const getDeviceFingerprint = async (): Promise<string> => {
  // Try to get existing fingerprint
  const existing = await SecureStore.getItemAsync(STORAGE_KEYS.DEVICE_ID);
  if (existing) {
    return existing;
  }

  // Generate new fingerprint based on device characteristics
  const deviceData = [
    Device.brand || 'unknown',
    Device.modelName || 'unknown',
    Device.osName || 'unknown',
    Device.osVersion || 'unknown',
    Device.deviceYearClass?.toString() || 'unknown',
    // Add some randomness to make it unique per installation
    Date.now().toString(),
  ].join('|');

  // Hash it
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    deviceData
  );

  // Store for future use
  await SecureStore.setItemAsync(STORAGE_KEYS.DEVICE_ID, hash);

  return hash;
};

// Get device info for registration
export const getDeviceInfo = () => ({
  brand: Device.brand,
  modelName: Device.modelName,
  osName: Device.osName,
  osVersion: Device.osVersion,
  platform: Device.osName === 'iOS' ? 'ios' : 'android',
});
