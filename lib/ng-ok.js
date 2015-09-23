'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

(function (root) {
  function logError(message) {
    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    console.error.apply(console, ['ng-ok: ' + message].concat(args));
  }

  function bindProperty($scope, model, scopeName, modelName) {
    var value = $scope[scopeName];

    Object.defineProperty($scope, scopeName, {
      set: function set(val) {
        return value = val;
      },
      get: function get() {
        return value;
      }
    });

    Object.defineProperty(model, modelName, {
      set: function set(val) {
        return value = val;
      },
      get: function get() {
        return value;
      }
    });
  }

  function getAttrName(propertyName, binding) {
    var match = binding.match(/\w+$/);

    return match ? match[0] : propertyName;
  }

  function scopeByBindings(bindings, namespace) {
    var scope = {};

    Object.keys(bindings).forEach(function (modelName) {
      var value = bindings[modelName];

      if (typeof value === 'object') {
        (function () {
          var model = value;

          Object.keys(model).forEach(function (propertyName) {
            var value = model[propertyName];
            var attrName = getAttrName(propertyName, value);

            scope['__' + namespace + '_' + modelName + '_' + attrName] = value;
          });
        })();
      } else if (typeof value === 'string') {
        scope[modelName] = value;
      } else {
        logError('wrong type `%s` of `%s` model declaration in `%s`. IGNORED', typeof value, modelName, namespace);
      }
    });

    return scope;
  }

  function bindWatchers(instance, watchers) {
    var namespace = arguments.length <= 2 || arguments[2] === undefined ? '' : arguments[2];

    var watchersProps = Object.keys(watchers);

    watchersProps.forEach(function (propName) {
      var watcherName = watchers[propName];

      if (typeof watcherName === 'object') {
        bindWatchers(instance, watcherName, namespace + propName + '.');
      } else {
        var tmp = watcherName.split(':');
        var type = 'normal';

        if (tmp.length > 1) {
          type = tmp[0];
          watcherName = tmp[1];
        }

        if (!watcherName && namespace) {
          watcherName = namespace.slice(0, -1);
        }

        if (watcherName && instance[watcherName]) {
          var _name = namespace + propName;
          var watcher = instance[watcherName].bind(instance);

          switch (type) {
            case 'normal':
              instance.$scope.$watch(_name, watcher);
              break;
            case 'deep':
              instance.$scope.$watch(_name, watcher, true);
              break;
            case 'group':
              instance.$scope.$watchGroup(_name, watcher);
              break;
            case 'collection':
              instance.$scope.$watchCollection(_name, watcher);
              break;
            default:
              logError('wrong type `%xs` of watcher `%s` of `%s` not found', type, watcherName, options.name);
              break;
          }
        } else {
          logError('watcher `%s` of `%s` not found', watcherName, options.name);
        }
      }
    });
  }

  function getOptions(comp) {
    var options = comp.config && comp.config() || {};
    var inject = comp.inject && comp.inject() || [];

    if (inject.length) {
      options.inject = inject;
    }

    options.require = [comp.name];

    if (typeof options.inject === 'string') {
      options.inject = options.inject.split(/\s*,\s*/);
    }

    var _getNameAndType = getNameAndType(comp);

    var _getNameAndType2 = _slicedToArray(_getNameAndType, 2);

    var name = _getNameAndType2[0];
    var type = _getNameAndType2[1];

    options.inject = (options.inject || []).filter(function (name) {
      if (name.match(/^[a-z]/)) {
        options.require.push('?' + name);
        return false;
      } else {
        return true;
      }
    });

    switch (type) {
      case 'Component':
        options.replace = options.replace || true;
        options.restrict = options.restrict || 'E';
        break;
      case 'Directive':
        options.replace = options.replace || false;
        options.restrict = options.restrict || 'A';
        break;
    }

    options.name = name;
    options.type = type;

    return options;
  }

  var types = ['Component', 'Directive', 'Service'];

  function getNameAndType(comp) {
    var fullName = comp.name;

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = types[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var type = _step.value;

        if (fullName.endsWith(type)) {
          return [fullName.slice(0, -type.length), type];
        }
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator['return']) {
          _iterator['return']();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    return [comp.name];
  }

  function generateDirective(app, options, comp) {
    var _options$watchers = options.watchers;
    var watchers = _options$watchers === undefined ? {} : _options$watchers;
    var _options$bind = options.bind;
    var bindings = _options$bind === undefined ? {} : _options$bind;
    var template = options.template;
    var templateUrl = options.templateUrl;
    var templateNamespace = options.templateNamespace;
    var terminal = options.terminal;
    var priority = options.priority;
    var multiElement = options.multiElement;
    var restrict = options.restrict;
    var replace = options.replace;
    var inject = options.inject;

    var require = [options.name];

    app.directive(options.name, ['$injector', function ($injector) {
      var injectables = {};

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = inject[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var _name2 = _step2.value;

          injectables[_name2] = $injector.get(_name2);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2['return']) {
            _iterator2['return']();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      var scope = scopeByBindings(bindings, options.name);

      return {
        multiElement: multiElement,
        restrict: restrict,
        replace: replace,
        priority: priority || 0,
        terminal: terminal,
        scope: scope,
        require: require,
        template: template,
        templateUrl: templateUrl,
        templateNamespace: templateNamespace,

        controller: function controller($scope, $element, $attrs, $transclude) {
          var proto = comp.prototype;
          var props = [];
          var instance = Object.create(comp.prototype);
          var instanceInjectables = { $scope: $scope, $element: $element, $attrs: $attrs, $transclude: $transclude };

          inject.forEach(function (key, i) {
            return instance[key] = injectables[key];
          });

          instance.$scope = $scope;
          instance.$el = $element;
          instance.$attrs = $attrs;
          instance.$transclude = $transclude;
          instance.$injectables = _extends({}, injectables, instanceInjectables);

          while (proto && proto !== Object.prototype) {
            props.push.apply(props, _toConsumableArray(Object.getOwnPropertyNames(proto)));
            proto = Reflect.getPrototypeOf(proto);
          }

          // bind methods from prototypes
          props.filter(function (key) {
            if (!key.startsWith('$') && !key.startsWith('_') && typeof instance[key] === 'function') {
              $scope[key] = instance[key].bind(instance);
            }
          });

          // bind models
          Object.keys(bindings).forEach(function (modelName) {
            var value = bindings[modelName];

            if (typeof value === 'object') {
              (function () {
                var model = $scope[modelName] = Object.create(null);
                var bindingObj = value;

                Object.keys(bindingObj).forEach(function (propertyName) {
                  var attrName = getAttrName(propertyName, bindingObj[propertyName]);

                  bindProperty($scope, model, '__' + options.name + '_' + modelName + '_' + attrName, propertyName);
                });

                $scope[modelName] = instance[modelName] = model;
              })();
            } else if (typeof value === 'string') {
              bindProperty($scope, instance, modelName, modelName);
            }
          });

          return instance;
        },

        compile: function compile() {
          return {
            pre: function pre($scope, $element, $attrs, $ctrls) {
              var instance = $ctrls[0];
              var injectables = instance.$injectables;

              injectables.$ctrls = $ctrls;

              $ctrls.slice(1).forEach(function (ctrl) {
                if (ctrl) {
                  var _getNameAndType3 = getNameAndType(ctrl.constructor);

                  var _getNameAndType32 = _slicedToArray(_getNameAndType3, 1);

                  var _name3 = _getNameAndType32[0];

                  instance[_name3] = ctrl;
                  injectables[_name3] = ctrl;
                }
              });

              comp.call(instance, injectables);

              if (instance.destructor) {
                $scope.$on('$destroy', instance.destructor.bind(instance));
              }
            },
            post: function post($scope, $element, $attrs, $ctrls) {
              var instance = $ctrls[0];

              if (instance.link) {
                instance.link(instance.$injectables);
              }

              bindWatchers(instance, watchers);
            }
          };
        }
      };
    }]);

    return app;
  }

  function generateService(app, options, comp) {
    var inject = options.inject;

    app.factory(options.name, ['$injector', function ($injector) {
      var injectables = {};

      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = inject[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var _name4 = _step3.value;

          injectables[_name4] = $injector.get(_name4);
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3['return']) {
            _iterator3['return']();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }

      var instance = Object.create(comp.prototype);

      Object.keys(injectables).forEach(function (key) {
        return instance[key] = injectables[key];
      });

      var ret = comp.call(instance, injectables);

      return ret || instance;
    }]);
  }

  // wrapper for angular modules
  var moduleWrapper = function moduleWrapper(app) {

    app.define = function define() {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      args.forEach(function (comp) {
        if (typeof comp !== 'function') return;

        var options = getOptions(comp);

        if (!options.type) {
          generateService(app, { name: comp.name }, function () {
            return comp;
          });
        } else {
          switch (options.type) {
            case 'Component':
              generateDirective(app, options, comp);
              break;
            case 'Directive':
              generateDirective(app, options, comp);
              break;
            case 'Service':
              generateService(app, options, comp);
              break;
            default:
              return;
          }
        }
      });

      return app;
    };

    return app;
  };

  // func to export
  var ngOk = function ngOk(angular) {
    if (!angular.ok) {
      (function () {
        var origModule = angular.module;

        angular.module = function () {
          for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
            args[_key3] = arguments[_key3];
          }

          return moduleWrapper(origModule.call.apply(origModule, [null].concat(args)));
        };

        angular.ok = true;
      })();
    }

    return angular;
  };

  // UMD
  (function (root, factory) {
    if (typeof define === 'function' && define.amd) {
      define([], factory);
    } else if (typeof module === 'object' && module.exports) {
      module.exports = factory();
    }if (typeof window === 'object') {
      if (window.angular) {
        ngOk(window.angular);
      } else {
        logError('angular is not defined');
      }
    } else {
      root.returnExports = factory();
    }
  })(root, function () {
    return ngOk;
  });
})(undefined);