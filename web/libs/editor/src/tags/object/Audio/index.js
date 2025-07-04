import Registry from "../../../core/Registry";
import { AudioModel } from "./model";
import { HtxAudio } from "./view_old";
import { AudioView as HtxAudio } from "./view";
import { AudioRegionModel } from "../../../regions/AudioRegion";
import { FF_DEV_1713, FF_DEV_2715, isFF } from "../../../utils/feature-flags";

Registry.addTag("audio", AudioModel, HtxAudio);
// @todo remove this once we have the ability to deprecate the old tag, for now allow the alias
Registry.addTag("audioplus", AudioModel, HtxAudio);
Registry.addObjectType(AudioModel);

export { AudioRegionModel, AudioModel, HtxAudio };
