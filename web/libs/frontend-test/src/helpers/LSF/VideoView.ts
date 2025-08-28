import { withMedia } from "@humansignal/frontend-test/helpers/utils/media/MediaMixin";
import type { ViewWithMedia } from "@humansignal/frontend-test/helpers/utils/media/types";

class VideoViewHelper extends withMedia(
  class implements ViewWithMedia {
    get _baseRootSelector() {
      return ".lsf-video-tag";
    }

    _rootSelector: string;

    constructor(rootSelector: string) {
      this._rootSelector = rootSelector.replace(/^\&/, this._baseRootSelector);
    }

    /**
     * Waits for video element to be ready for playback
     * @param timeout maximum time to wait
     */
    waitForVideoReady(timeout = 5000) {
      cy.log("🎬 Waiting for video element to be ready...");
      return cy
        .get("video", { timeout })
        .should("exist")
        .should(([video]) => {
          expect(video.readyState).to.be.greaterThan(0);
        });
    }

    /**
     * Waits for video to be in a specific play state
     * @param shouldBePlaying expected play state
     * @param timeout maximum time to wait
     */
    waitForPlayState(shouldBePlaying: boolean, timeout = 8000) {
      cy.log(`🎬 Waiting for video to ${shouldBePlaying ? "start playing" : "be paused"}...`);

      return cy.get("video", { timeout }).should(([video]) => {
        expect(video.paused).to.equal(!shouldBePlaying);
      });
    }

    /**
     * Waits for video playback rate to reach expected value
     * @param expectedRate expected playback rate
     * @param timeout maximum time to wait
     */
    waitForPlaybackRate(expectedRate: number, timeout = 8000) {
      cy.log(`🎬 Waiting for video playback rate to be ${expectedRate}x...`);

      return cy.get("video", { timeout }).should(([video]) => {
        expect(video.playbackRate).to.equal(expectedRate);
      });
    }

    /**
     * Waits for video current time to stabilize (not changing)
     * @param tolerance tolerance for time changes
     * @param stabilityDuration how long to be stable (ms)
     * @param timeout maximum time to wait
     */
    waitForTimeStabilization(tolerance = 0.01, stabilityDuration = 200, timeout = 8000) {
      let lastVideoTime: number | null = null;
      let stableStartTime: number | null = null;

      const checkStability = (): Cypress.Chainable => {
        return cy.get("video").then(([video]) => {
          const currentTime = Date.now();
          const videoTimeDiff = lastVideoTime ? Math.abs(video.currentTime - lastVideoTime) : Number.POSITIVE_INFINITY;

          if (videoTimeDiff <= tolerance) {
            if (!stableStartTime) {
              stableStartTime = currentTime;
              cy.log("🔄 Video time starting to stabilize...");
            } else if (currentTime - stableStartTime >= stabilityDuration) {
              cy.log("✅ Video time stabilized!");
              return cy.wrap(null);
            }
          } else {
            stableStartTime = null;
          }

          lastVideoTime = video.currentTime;

          if (currentTime - (stableStartTime || currentTime) > timeout) {
            cy.log("⏰ Video time stabilization timeout");
            return cy.wrap(null);
          }

          cy.wait(50);
          return checkStability();
        });
      };

      cy.log("🏁 Waiting for video time to stabilize...");
      return checkStability();
    }
  },
) {}

const VideoView = new VideoViewHelper("&:eq(0)");
const useVideoView = (rootSelector: string) => {
  return new VideoViewHelper(rootSelector);
};

export { VideoView, useVideoView };
