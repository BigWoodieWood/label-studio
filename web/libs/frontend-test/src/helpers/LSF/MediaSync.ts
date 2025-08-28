import { AudioView } from "./AudioView";
import { VideoView } from "./VideoView";

export class MediaSync {
  /**
   * Waits for audio and video elements to be synchronized
   * @param tolerance tolerance for time/rate differences (default: 0.01s = 10ms)
   * @param timeout maximum time to wait
   */
  static waitForSync(tolerance = 0.01, timeout = 5000) {
    const startTime = Date.now();

    const checkSync = (): Cypress.Chainable => {
      if (Date.now() - startTime > timeout) {
        cy.log(`⏰ Media sync timeout after ${timeout}ms`);
        return cy.wrap(null);
      }

      return cy.get("audio").then(([audio]) => {
        return cy.get("video").then(([video]) => {
          const timeDiff = Math.abs(audio.currentTime - video.currentTime);
          const rateDiff = Math.abs(audio.playbackRate - video.playbackRate);

          if (timeDiff <= tolerance && rateDiff <= tolerance) {
            cy.log(`🎯 Media sync achieved! Time diff: ${timeDiff.toFixed(3)}s, Rate diff: ${rateDiff.toFixed(3)}`);
            return cy.wrap(null);
          }

          cy.log(`🔄 Media syncing... Time diff: ${timeDiff.toFixed(3)}s, Rate diff: ${rateDiff.toFixed(3)}`);
          cy.wait(50);
          return checkSync();
        });
      });
    };

    cy.log("🏁 Waiting for audio/video synchronization...");
    return checkSync();
  }

  /**
   * Waits for both audio and video to be in a specific play state
   * @param shouldBePlaying expected play state
   * @param timeout maximum time to wait
   */
  static waitForPlayState(shouldBePlaying: boolean, timeout = 8000) {
    cy.log(`🎭 Waiting for audio/video to ${shouldBePlaying ? "start playing" : "be paused"}...`);

    return cy.then(() => {
      // Use Promise.all equivalent in Cypress
      return AudioView.waitForPlayState(shouldBePlaying, timeout).then(() => {
        return VideoView.waitForPlayState(shouldBePlaying, timeout);
      });
    });
  }

  /**
   * Waits for both audio and video playback rate to reach expected value
   * @param expectedRate expected playback rate
   * @param timeout maximum time to wait
   */
  static waitForPlaybackRate(expectedRate: number, timeout = 8000) {
    cy.log(`🎭 Waiting for audio/video playback rate to be ${expectedRate}x...`);

    return cy.then(() => {
      return AudioView.waitForPlaybackRate(expectedRate, timeout).then(() => {
        return VideoView.waitForPlaybackRate(expectedRate, timeout);
      });
    });
  }

  /**
   * Waits for both audio and video time to stabilize
   * @param tolerance tolerance for time changes
   * @param stabilityDuration how long to be stable (ms)
   * @param timeout maximum time to wait
   */
  static waitForTimeStabilization(tolerance = 0.01, stabilityDuration = 200, timeout = 8000) {
    cy.log("🎭 Waiting for audio/video time to stabilize...");

    return cy.then(() => {
      return AudioView.waitForTimeStabilization(tolerance, stabilityDuration, timeout).then(() => {
        return VideoView.waitForTimeStabilization(tolerance, stabilityDuration, timeout);
      });
    });
  }
}
