/*!
 * vue-howler v0.3.3
 * (c) 2017 Mick Dekkers
 * Released under the MIT License.
 */
'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var howler = require('howler');
var clamp = _interopDefault(require('lodash.clamp'));
var values = _interopDefault(require('lodash.values'));
var assign = _interopDefault(require('lodash.assign'));

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};





















var get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;

    if (getter === undefined) {
      return undefined;
    }

    return getter.call(receiver);
  }
};

















var set = function set(object, property, value, receiver) {
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent !== null) {
      set(parent, property, value, receiver);
    }
  } else if ("value" in desc && desc.writable) {
    desc.value = value;
  } else {
    var setter = desc.set;

    if (setter !== undefined) {
      setter.call(receiver, value);
    }
  }

  return value;
};

var index = {
  props: {
    /**
     * An array of audio file urls
     */
    sources: {
      type: Array,
      required: true,
      validator: function validator(sources) {
        // Every source must be a non-empty string
        return sources.every(function (source) {
          return typeof source === 'string' && source.length > 0;
        });
      }
    },
    /**
     * Whether to start the playback
     * when the component is mounted
     */
    autoplay: {
      type: Boolean,
      default: false
    },
    /**
     * Whether to start the playback again
     * automatically after it is done playing
     */
    loop: {
      type: Boolean,
      default: false
    },
    /**
     * Whether to start downloading the audio
     * file when the component is mounted
     */
    preload: {
      type: Boolean,
      default: true
    },
    /**
     * Whether to force HTML5 Audio
     */
    html5: {
      type: Boolean,
      default: false
    }
  },

  data: function data() {
    var _this = this;

    return {
      /**
       * The Howl instance used for playback
       */
      _howl: null,
      /**
       * Whether audio is currently playing
       */
      playing: false,
      /**
       * Whether the audio playback is muted
       */
      muted: false,
      /**
       * The volume of the playback on a scale of 0 to 1
       */
      volume: 1.0,
      /**
       * The rate (speed) of the playback on a scale of 0.5 to 4
       */
      rate: 1.0,
      /**
       * The position of playback in seconds
       */
      seek: 0,
      /**
       * The duration of the audio in seconds
       */
      duration: 0,
      /**
       * Functions that poll the Howl instance
       * to update various data
       */
      _polls: {
        seek: {
          id: null,
          interval: 1000 / 4, // 4 times per second (4Hz)
          hook: function hook() {
            _this.seek = _this.$data._howl.seek();
          }
        }
      },
      /**
       * A list of howl events to listen to and
       * functions to call when they are triggered
       */
      _howlEvents: [{
        name: 'load',
        hook: function hook() {
          _this.duration = _this.$data._howl.duration();
        }
      }, 'loaderror', {
        name: 'play',
        hook: function hook() {
          _this.playing = true;
        }
      }, {
        name: 'end',
        hook: function hook() {
          _this.playing = false;
        }
      }, {
        name: 'pause',
        hook: function hook() {
          _this.playing = false;
        }
      }, {
        name: 'stop',
        hook: function hook() {
          _this.playing = false;
          if (_this.$data._howl != null) {
            _this.seek = _this.$data._howl.seek();
          }
        }
      }, 'mute', {
        name: 'volume',
        hook: function hook() {
          _this.volume = _this.$data._howl.volume();
        }
      }, {
        name: 'rate',
        hook: function hook() {
          _this.rate = _this.$data._howl.rate();
        }
      }, {
        name: 'seek',
        hook: function hook() {
          _this.seek = _this.$data._howl.seek();
        }
      }, 'fade']
    };
  },


  computed: {
    /**
     * The progress of the playback on a scale of 0 to 1
     */
    progress: function progress() {
      if (this.duration === 0) return 0;
      return this.seek / this.duration;
    }
  },

  created: function created() {
    this._initialize();
  },
  beforeDestroy: function beforeDestroy() {
    this._cleanup();
  },


  watch: {
    playing: function playing(_playing) {
      // Update the seek
      this.seek = this.$data._howl.seek();

      if (_playing) {
        // Start the seek poll
        this.$data._polls.seek.id = setInterval(this.$data._polls.seek.hook, this.$data._polls.seek.interval);
      } else {
        // Stop the seek poll
        clearInterval(this.$data._polls.seek.id);
      }
    },
    sources: function sources(_sources) {
      this._reinitialize();
    }
  },

  methods: {
    /**
     * Reinitialize the Howler player
     */
    _reinitialize: function _reinitialize() {
      this._cleanup(false);
      this._initialize();
    },

    /**
     * Initialize the Howler player
     */
    _initialize: function _initialize() {
      var _this2 = this;

      this.$data._howl = new howler.Howl({
        src: this.sources,
        volume: this.volume,
        rate: this.rate,
        mute: this.muted,
        autoplay: this.autoplay,
        loop: this.loop,
        preload: this.preload,
        html5: this.html5
      });

      var duration = this.$data._howl.duration();
      this.duration = duration;

      if (duration > 0) {
        // The audio file(s) have been cached. Howler won't
        // emit a load event, so we will do this manually
        this.$emit('load');
      }

      // Bind to all Howl events
      this.$data._howlEvents = this.$data._howlEvents.map(function (event) {
        // Normalize string shorthands to objects
        if (typeof event === 'string') {
          event = { name: event };
        }

        // Create a handler
        var handler = function handler(id, details) {
          if (typeof event.hook === 'function') event.hook(id, details);
          _this2.$emit(event.name, id, details);
        };

        // Bind the handler
        _this2.$data._howl.on(event.name, handler);

        // Return the name and handler to unbind later
        return assign({}, event, { handler: handler });
      });
    },

    /**
     * Clean up the Howler player
     */
    _cleanup: function _cleanup() {
      var _this3 = this;

      var resetSettings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

      // Stop all playback
      this.stop();

      // Stop all polls
      values(this.$data._polls).forEach(function (poll) {
        if (poll.id != null) clearInterval(poll.id);
      });

      // Clear all event listeners
      this.$data._howlEvents.map(function (event) {
        if (event.handler) {
          _this3.$data._howl.off(event.name, event.handler);

          var _event = assign({}, event);
          delete _event.handler;
          return _event;
        }

        return event;
      });

      // Destroy the Howl instance
      this.$data._howl = null;

      this.duration = 0;

      if (resetSettings) {
        this.muted = false;
        this.volume = 1.0;
        this.rate = 1.0;
      }
    },

    /**
     * Start the playback
     */
    play: function play() {
      if (!this.playing) this.$data._howl.play();
    },

    /**
     * Pause the playback
     */
    pause: function pause() {
      if (this.playing) this.$data._howl.pause();
    },

    /**
     * Toggle playing or pausing the playback
     */
    togglePlayback: function togglePlayback() {
      if (!this.playing) {
        this.$data._howl.play();
      } else {
        this.$data._howl.pause();
      }
    },

    /**
     * Stop the playback (also resets the seek to 0)
     */
    stop: function stop() {
      this.$data._howl.stop();
    },

    /**
     * Mute the playback
     */
    mute: function mute() {
      this.$data._howl.mute(true);
      this.muted = true;
    },

    /**
     * Unmute the playback
     */
    unmute: function unmute() {
      this.$data._howl.mute(false);
      this.muted = false;
    },

    /**
     * Toggle muting and unmuting the playback
     */
    toggleMute: function toggleMute() {
      this.$data._howl.mute(!this.muted);
      this.muted = !this.muted;
    },

    /**
     * Set the volume of the playback
     * @param {Number} volume - The new volume.
     * The value is clamped between 0 and 1
     */
    setVolume: function setVolume(volume) {
      if (typeof volume !== 'number') {
        throw new Error('volume must be a number, got a ' + (typeof volume === 'undefined' ? 'undefined' : _typeof(volume)) + ' instead');
      }

      this.$data._howl.volume(clamp(volume, 0, 1));
    },

    /**
     * Set the rate (speed) of the playback
     * @param {Number} rate - The new rate.
     * The value is clamped between 0.5 and 4
     */
    setRate: function setRate(rate) {
      if (typeof rate !== 'number') {
        throw new Error('rate must be a number, got a ' + (typeof rate === 'undefined' ? 'undefined' : _typeof(rate)) + ' instead');
      }

      this.$data._howl.rate(clamp(rate, 0.5, 4));
    },

    /**
     * Set the position of the playback
     * @param {Number} seek - The new position in seconds.
     * The value is clamped between 0 and the duration
     */
    setSeek: function setSeek(seek) {
      if (typeof seek !== 'number') {
        throw new Error('seek must be a number, got a ' + (typeof seek === 'undefined' ? 'undefined' : _typeof(seek)) + ' instead');
      }

      this.$data._howl.seek(clamp(seek, 0, this.duration));
    },

    /**
     * Set the progress of the playback
     * @param {Number} progress - The new progress.
     * The value is clamped between 0 and 1
     */
    setProgress: function setProgress(progress) {
      if (typeof progress !== 'number') {
        throw new Error('progress must be a number, got a ' + (typeof progress === 'undefined' ? 'undefined' : _typeof(progress)) + ' instead');
      }

      this.setSeek(clamp(progress, 0, 1) * this.duration);
    }
  }
};

module.exports = index;
