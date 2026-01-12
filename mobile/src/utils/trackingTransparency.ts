// App Tracking Transparency (ATT) Handler
// Required for iOS 14.5+ when displaying personalized ads

import { Platform } from 'react-native';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
  PermissionStatus,
} from 'expo-tracking-transparency';

export type TrackingStatus = 
  | 'unavailable'
  | 'denied'
  | 'authorized'
  | 'restricted'
  | 'not-determined';

class TrackingTransparencyService {
  private isAvailable = false;
  private currentStatus: TrackingStatus = 'not-determined';

  async initialize(): Promise<void> {
    if (Platform.OS !== 'ios') {
      this.isAvailable = false;
      return;
    }

    try {
      this.isAvailable = true;
      await this.checkStatus();
    } catch (error) {
      console.log('⚠️ Tracking transparency not available:', error);
      this.isAvailable = false;
    }
  }

  private mapPermissionStatus(status: PermissionStatus): TrackingStatus {
    switch (status) {
      case PermissionStatus.GRANTED:
        return 'authorized';
      case PermissionStatus.DENIED:
        return 'denied';
      case PermissionStatus.UNDETERMINED:
        return 'not-determined';
      default:
        return 'unavailable';
    }
  }

  async checkStatus(): Promise<TrackingStatus> {
    if (!this.isAvailable) {
      return 'unavailable';
    }

    try {
      const { status } = await getTrackingPermissionsAsync();
      this.currentStatus = this.mapPermissionStatus(status);
      return this.currentStatus;
    } catch (error) {
      console.error('Failed to check tracking status:', error);
      return 'unavailable';
    }
  }

  async requestPermission(): Promise<TrackingStatus> {
    if (!this.isAvailable) {
      console.log('ATT not available on this device/platform');
      return 'unavailable';
    }

    try {
      // Only request if not already determined
      if (this.currentStatus === 'not-determined') {
        const { status } = await requestTrackingPermissionsAsync();
        this.currentStatus = this.mapPermissionStatus(status);
        console.log('📱 ATT Permission result:', this.currentStatus);
        return this.currentStatus;
      }
      return this.currentStatus;
    } catch (error) {
      console.error('Failed to request tracking permission:', error);
      return 'unavailable';
    }
  }

  getStatus(): TrackingStatus {
    return this.currentStatus;
  }

  canShowPersonalizedAds(): boolean {
    // Only show personalized ads if explicitly authorized
    return this.currentStatus === 'authorized';
  }
}

export const trackingService = new TrackingTransparencyService();
export default trackingService;
