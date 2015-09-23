(function(root) {
  function logError(message, ...args) {
    console.error('ng-ok: ' + message, ...args);
  }

  function bindProperty($scope, model, scopeName, modelName) {
    let value = $scope[scopeName];

    Object.defineProperty($scope, scopeName, {
      set: (val) => value = val,
      get: () => value
    });

    Object.defineProperty(model, modelName, {
      set: (val) => value = val,
      get: () => value
    });
  }

  function getAttrName(propertyName, binding) {
    let match = binding.match(/\w+$/);

    return match ? match[0] : propertyName;
  }

  function scopeByBindings(bindings, namespace) {
    let scope = {};

    Object.keys(bindings)
      .forEach( modelName => {
        let value = bindings[modelName];

        if (typeof(value) === 'object') {
          let model = value;

          Object.keys(model)
            .forEach( propertyName => {
              let value = model[propertyName];
              let attrName = getAttrName(propertyName, value);

              scope['__' + namespace + '_' + modelName + '_' + attrName] = value;
            });
        } else if (typeof(value) === 'string') {
          scope[modelName] = value;
        } else {
          logError('wrong type `%s` of `%s` model declaration in `%s`. IGNORED', typeof(value), modelName, namespace);
        }
      });

    return scope;
  }

  function bindWatchers(instance, watchers, namespace = '') {
    let watchersProps = Object.keys(watchers);

    watchersProps.forEach( propName => {
      let watcherName = watchers[propName];

      if (typeof(watcherName) === 'object') {
        bindWatchers(instance, watcherName, namespace + propName + '.');
      } else {
        let tmp = watcherName.split(':');
        let type = 'normal';

        if (tmp.length > 1) {
          type = tmp[0];
          watcherName = tmp[1];
        }

        if (!watcherName && namespace) {
          watcherName = namespace.slice(0, -1);
        }

        if (watcherName && instance[watcherName]) {
          let name = namespace + propName;
          let watcher = instance[watcherName].bind(instance);

          switch(type) {
            case 'normal':
              instance.$scope.$watch(name, watcher);
              break;
            case 'deep':
              instance.$scope.$watch(name, watcher, true);
              break;
            case 'group':
              instance.$scope.$watchGroup(name, watcher);
              break;
            case 'collection':
              instance.$scope.$watchCollection(name, watcher);
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
    let options = (comp.config && comp.config()) || {};
    let inject = (comp.inject && comp.inject()) || [];

    if (inject.length) {
      options.inject = inject;
    }

    options.require = [comp.name];

    if (typeof(options.inject) === 'string') {
      options.inject = options.inject.split(/\s*,\s*/);
    }

    let [name, type] = getNameAndType(comp);

    options.inject = (options.inject || []).filter( name => {
      if (name.match(/^[a-z]/)) {
        options.require.push('?' + name);
        return false;
      } else {
        return true;
      }
    });

    switch(type) {
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

  let types = ['Component', 'Directive', 'Service'];

  function getNameAndType(comp) {
    let fullName = comp.name;

    for (let type of types) {
      if (fullName.endsWith(type)) {
        return [fullName.slice(0, -type.length), type];
      }
    }

    return [comp.name];
  }

  function generateDirective(app, options, comp) {
    let {
      watchers = {},
      bind: bindings = {},
      template,
      templateUrl,
      templateNamespace,
      terminal,
      priority,
      multiElement,
      restrict,
      replace,
      inject
      } = options;
    let require = [options.name];

    app.directive(options.name, ['$injector', function($injector) {
      let injectables = {};

      for (let name of inject) {
        injectables[name] = $injector.get(name);
      }

      let scope = scopeByBindings(bindings, options.name);

      return {
        multiElement,
        restrict,
        replace,
        priority: priority || 0,
        terminal,
        scope,
        require,
        template,
        templateUrl,
        templateNamespace,

        controller: ($scope, $element, $attrs, $transclude) => {
          let proto = comp.prototype;
          let props = [];
          let instance = Object.create(comp.prototype);
          let instanceInjectables = { $scope, $element, $attrs, $transclude };

          inject.forEach( (key, i) => instance[key] = injectables[key] );

          instance.$scope = $scope;
          instance.$el = $element;
          instance.$attrs = $attrs;
          instance.$transclude = $transclude;
          instance.$injectables = {...injectables, ...instanceInjectables};

          while (proto && proto !== Object.prototype) {
            props.push(...Object.getOwnPropertyNames(proto));
            proto = Reflect.getPrototypeOf(proto);
          }

          // bind methods from prototypes
          props.filter( (key) => {
            if (!key.startsWith('$') && !key.startsWith('_') && typeof(instance[key]) === 'function') {
              $scope[key] = instance[key].bind(instance);
            }
          });

          // bind models
          Object.keys(bindings).forEach( modelName => {
            let value = bindings[modelName];

            if (typeof(value) === 'object') {
              let model = $scope[modelName] = Object.create(null);
              let bindingObj = value;

              Object.keys(bindingObj).forEach( propertyName => {
                let attrName = getAttrName(propertyName, bindingObj[propertyName]);

                bindProperty($scope, model, '__' + options.name + '_' + modelName + '_' + attrName, propertyName);
              });

              $scope[modelName] = instance[modelName] = model;
            } else if (typeof(value) === 'string') {
              bindProperty($scope, instance, modelName, modelName);
            }
          });

          return instance;
        },

        compile: () => {
          return {
            pre: ($scope, $element, $attrs, $ctrls) => {
              let instance = $ctrls[0];
              let injectables = instance.$injectables;

              injectables.$ctrls = $ctrls;

              $ctrls.slice(1).forEach( ctrl => {
                if (ctrl) {
                  let [name] = getNameAndType(ctrl.constructor);
                  instance[name] = ctrl;
                  injectables[name] = ctrl;
                }
              });

              comp.call(instance, injectables);

              if (instance.destructor) {
                $scope.$on('$destroy', instance.destructor.bind(instance));
              }
            },
            post: ($scope, $element, $attrs, $ctrls) => {
              let instance = $ctrls[0];

              if (instance.link) {
                instance.link(instance.$injectables);
              }

              bindWatchers(instance, watchers);
            }
          }
        }
      };
    }]);

    return app;
  }

  function generateService(app, options, comp) {
    let inject = options.inject;

    app.factory(options.name, ['$injector', ($injector) => {
      let injectables = {};

      for (let name of inject) {
        injectables[name] = $injector.get(name);
      }

      let instance = Object.create(comp.prototype);

      Object.keys(injectables).forEach( key => instance[key] = injectables[key] );

      let ret = comp.call(instance, injectables);

      return ret || instance;
    }]);
  }

  // wrapper for angular modules
  let moduleWrapper = (app) => {

    app.define = function define(...args) {
      args.forEach( comp => {
        if (typeof(comp) !== 'function') return;

        let options = getOptions(comp);

        if (!options.type) {
          generateService(app, { name: comp.name }, () => comp);
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
  let ngOk = (angular) => {
    if (!angular.ok) {
      let origModule = angular.module;

      angular.module = (...args) => {
        return moduleWrapper(origModule.call(null, ...args));
      }

      angular.ok = true;
    }

    return angular;
  };

  // UMD
  (function (root, factory) {
    if (typeof define === 'function' && define.amd) {
      define([], factory);
    } else if (typeof module === 'object' && module.exports) {
      module.exports = factory();
    } if (typeof window === 'object') {
      if (window.angular) {
        ngOk(window.angular);
      } else {
        logError('angular is not defined');
      }
    } else {
      root.returnExports = factory();
    }
  }(root, function () {
    return ngOk;
  }));

})(this);