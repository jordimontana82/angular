// TODO(tbosch): clang-format screws this up, see https://github.com/angular/clang-format/issues/11.
// Enable clang-format here again when this is fixed.
// clang-format off
import {
  describe,
  ddescribe,
  it,
  iit,
  xit,
  xdescribe,
  expect,
  beforeEach,
  inject,
  AsyncTestCompleter,
  el,
  containsRegexp
} from 'angular2/test_lib';
import {SpyView, SpyElementRef} from '../spies';
import {isBlank, isPresent, stringify} from 'angular2/src/core/facade/lang';
import {
  ListWrapper,
  MapWrapper,
  StringMapWrapper,
  iterateListLike
} from 'angular2/src/core/facade/collection';
import {
  ProtoElementInjector,
  ElementInjector,
  PreBuiltObjects,
  DirectiveBinding,
  TreeNode
} from 'angular2/src/core/linker/element_injector';
import {
  Attribute,
  Query,
  ViewQuery,
  ComponentMetadata,
  DirectiveMetadata
} from 'angular2/src/core/metadata';
import {OnDestroy} from 'angular2/lifecycle_hooks';
import {bind, Injector, Binding, Optional, Inject, Injectable, Self, SkipSelf, InjectMetadata, Host, HostMetadata, SkipSelfMetadata} from 'angular2/core';
import {ViewContainerRef} from 'angular2/src/core/linker/view_container_ref';
import {TemplateRef} from 'angular2/src/core/linker/template_ref';
import {ElementRef} from 'angular2/src/core/linker/element_ref';
import {DynamicChangeDetector, ChangeDetectorRef, Parser, Lexer} from 'angular2/src/core/change_detection/change_detection';
import {QueryList} from 'angular2/src/core/linker/query_list';
import {AppView, AppViewContainer} from "angular2/src/core/linker/view";

function createDummyView(detector = null): AppView {
  var res = new SpyView();
  res.prop("changeDetector", detector);
  res.prop("elementOffset", 0);
  res.prop("elementInjectors", []);
  res.prop("viewContainers", []);
  res.prop("ownBindersCount", 0);
  return <any> res;
}

function addInj(view, inj) {
  var injs: ElementInjector[] = view.elementInjectors;
  injs.push(inj);
  var containers: AppViewContainer[] = view.viewContainers;
  containers.push(null);
  view.prop("ownBindersCount", view.ownBindersCount + 1);
}

@Injectable()
class SimpleDirective {}

class SimpleService {}

@Injectable()
class SomeOtherDirective {}

var _constructionCount = 0;
@Injectable()
class CountingDirective {
  count: number;
  constructor() {
    this.count = _constructionCount;
    _constructionCount += 1;
  }
}

@Injectable()
class FancyCountingDirective extends CountingDirective {
  constructor() { super(); }
}

@Injectable()
class NeedsDirective {
  dependency: SimpleDirective;
  constructor(@Self() dependency: SimpleDirective) { this.dependency = dependency; }
}

@Injectable()
class OptionallyNeedsDirective {
  dependency: SimpleDirective;
  constructor(@Self() @Optional() dependency: SimpleDirective) { this.dependency = dependency; }
}

@Injectable()
class NeeedsDirectiveFromHost {
  dependency: SimpleDirective;
  constructor(@Host() dependency: SimpleDirective) { this.dependency = dependency; }
}

@Injectable()
class NeedsDirectiveFromHostShadowDom {
  dependency: SimpleDirective;
  constructor(dependency: SimpleDirective) { this.dependency = dependency; }
}

@Injectable()
class NeedsService {
  service: any;
  constructor(@Inject("service") service) { this.service = service; }
}

@Injectable()
class NeedsServiceFromHost {
  service: any;
  constructor(@Host() @Inject("service") service) { this.service = service; }
}

class HasEventEmitter {
  emitter;
  constructor() { this.emitter = "emitter"; }
}

class NeedsAttribute {
  typeAttribute;
  titleAttribute;
  fooAttribute;
  constructor(@Attribute('type') typeAttribute: String, @Attribute('title') titleAttribute: String,
              @Attribute('foo') fooAttribute: String) {
    this.typeAttribute = typeAttribute;
    this.titleAttribute = titleAttribute;
    this.fooAttribute = fooAttribute;
  }
}

@Injectable()
class NeedsAttributeNoType {
  fooAttribute;
  constructor(@Attribute('foo') fooAttribute) { this.fooAttribute = fooAttribute; }
}

@Injectable()
class NeedsQuery {
  query: QueryList<CountingDirective>;
  constructor(@Query(CountingDirective) query: QueryList<CountingDirective>) { this.query = query; }
}

@Injectable()
class NeedsViewQuery {
  query: QueryList<CountingDirective>;
  constructor(@ViewQuery(CountingDirective) query: QueryList<CountingDirective>) { this.query = query; }
}

@Injectable()
class NeedsQueryByVarBindings {
  query: QueryList<any>;
  constructor(@Query("one,two") query: QueryList<any>) { this.query = query; }
}

@Injectable()
class NeedsTemplateRefQuery {
  query: QueryList<TemplateRef>;
  constructor(@Query(TemplateRef) query: QueryList<TemplateRef>) { this.query = query; }
}

@Injectable()
class NeedsElementRef {
  elementRef;
  constructor(ref: ElementRef) { this.elementRef = ref; }
}

@Injectable()
class NeedsViewContainer {
  viewContainer;
  constructor(vc: ViewContainerRef) { this.viewContainer = vc; }
}

@Injectable()
class NeedsTemplateRef {
  templateRef;
  constructor(ref: TemplateRef) { this.templateRef = ref; }
}

@Injectable()
class OptionallyInjectsTemplateRef {
  templateRef;
  constructor(@Optional() ref: TemplateRef) { this.templateRef = ref; }
}

@Injectable()
class DirectiveNeedsChangeDetectorRef {
  constructor(public changeDetectorRef: ChangeDetectorRef) {}
}

@Injectable()
class ComponentNeedsChangeDetectorRef {
  constructor(public changeDetectorRef: ChangeDetectorRef) {}
}

@Injectable()
class PipeNeedsChangeDetectorRef {
  constructor(public changeDetectorRef: ChangeDetectorRef) {}
}

class A_Needs_B {
  constructor(dep) {}
}

class B_Needs_A {
  constructor(dep) {}
}

class DirectiveWithDestroy implements OnDestroy {
  onDestroyCounter: number;

  constructor() { this.onDestroyCounter = 0; }

  onDestroy() { this.onDestroyCounter++; }
}

export function main() {
  var defaultPreBuiltObjects = new PreBuiltObjects(null, createDummyView(), <any>new SpyElementRef(), null);

  // An injector with more than 10 bindings will switch to the dynamic strategy
  var dynamicBindings = [];

  for (var i = 0; i < 20; i++) {
    dynamicBindings.push(bind(i).toValue(i));
  }

  function createPei(parent, index, bindings, distance = 1, hasShadowRoot = false, dirVariableBindings = null) {
    var directiveBinding = ListWrapper.map(bindings, b => {
      if (b instanceof DirectiveBinding) return b;
      if (b instanceof Binding) return DirectiveBinding.createFromBinding(b, null);
      return DirectiveBinding.createFromType(b, null);
    });
    return ProtoElementInjector.create(parent, index, directiveBinding, hasShadowRoot, distance, dirVariableBindings);
  }

  function injector(bindings, imperativelyCreatedInjector = null, isComponent: boolean = false,
                    preBuiltObjects = null, attributes = null, dirVariableBindings = null) {
    var proto = createPei(null, 0, bindings, 0, isComponent, dirVariableBindings);
    proto.attributes = attributes;

    var inj = proto.instantiate(null);
    var preBuilt = isPresent(preBuiltObjects) ? preBuiltObjects : defaultPreBuiltObjects;
    inj.hydrate(imperativelyCreatedInjector, null, preBuilt);
    return inj;
  }

  function parentChildInjectors(parentBindings, childBindings, parentPreBuildObjects = null, imperativelyCreatedInjector = null) {
    if (isBlank(parentPreBuildObjects)) parentPreBuildObjects = defaultPreBuiltObjects;

    var protoParent = createPei(null, 0, parentBindings);
    var parent = protoParent.instantiate(null);

    parent.hydrate(null, null, parentPreBuildObjects);

    var protoChild = createPei(protoParent, 1, childBindings, 1, false);
    var child = protoChild.instantiate(parent);
    child.hydrate(imperativelyCreatedInjector, null, defaultPreBuiltObjects);

    return child;
  }

  function hostShadowInjectors(hostBindings: any[],
                               shadowBindings: any[], imperativelyCreatedInjector = null): ElementInjector {
    var protoHost = createPei(null, 0, hostBindings, 0, true);
    var host = protoHost.instantiate(null);
    host.hydrate(null, null, defaultPreBuiltObjects);

    var protoShadow = createPei(null, 0, shadowBindings, 0, false);
    var shadow = protoShadow.instantiate(null);
    shadow.hydrate(imperativelyCreatedInjector, host, null);

    return shadow;
  }

  describe('TreeNodes', () => {
    var root, child;

    beforeEach(() => {
      root = new TreeNode(null);
      child = new TreeNode(root);
    });

    it('should support removing and adding the parent', () => {
      expect(child.parent).toEqual(root);
      child.remove();
      expect(child.parent).toEqual(null);
      root.addChild(child);
      expect(child.parent).toEqual(root);
    });
  });

  describe("ProtoElementInjector", () => {
    describe("direct parent", () => {
      it("should return parent proto injector when distance is 1", () => {
        var distance = 1;
        var protoParent = createPei(null, 0, []);
        var protoChild = createPei(protoParent, 0, [], distance, false);

        expect(protoChild.directParent()).toEqual(protoParent);
      });

      it("should return null otherwise", () => {
        var distance = 2;
        var protoParent = createPei(null, 0, []);
        var protoChild = createPei(protoParent, 0, [], distance, false);

        expect(protoChild.directParent()).toEqual(null);
      });

    });

    describe('inline strategy', () => {
      it("should allow for direct access using getBindingAtIndex", () => {
        var proto = createPei(null, 0, [bind(SimpleDirective).toClass(SimpleDirective)]);

        expect(proto.getBindingAtIndex(0)).toBeAnInstanceOf(DirectiveBinding);
        expect(() => proto.getBindingAtIndex(-1)).toThrowError('Index -1 is out-of-bounds.');
        expect(() => proto.getBindingAtIndex(10)).toThrowError('Index 10 is out-of-bounds.');
      });
    });

    describe('dynamic strategy', () => {
      it("should allow for direct access using getBindingAtIndex", () => {
        var proto = createPei(null, 0, dynamicBindings);

        expect(proto.getBindingAtIndex(0)).toBeAnInstanceOf(DirectiveBinding);
        expect(() => proto.getBindingAtIndex(-1)).toThrowError('Index -1 is out-of-bounds.');
        expect(() => proto.getBindingAtIndex(dynamicBindings.length - 1)).not.toThrow();
        expect(() => proto.getBindingAtIndex(dynamicBindings.length))
            .toThrowError(`Index ${dynamicBindings.length} is out-of-bounds.`);
      });
    });

    describe('event emitters', () => {
      it('should return a list of event accessors', () => {
        var binding = DirectiveBinding.createFromType(HasEventEmitter,
                                                      new DirectiveMetadata({outputs: ['emitter']}));

        var inj = createPei(null, 0, [binding]);
        expect(inj.eventEmitterAccessors.length).toEqual(1);

        var accessor = inj.eventEmitterAccessors[0][0];
        expect(accessor.eventName).toEqual('emitter');
        expect(accessor.getter(new HasEventEmitter())).toEqual('emitter');
      });

      it('should allow a different event vs field name', () => {
        var binding = DirectiveBinding.createFromType(HasEventEmitter,
            new DirectiveMetadata({outputs: ['emitter: publicEmitter']}));

        var inj = createPei(null, 0, [binding]);
        expect(inj.eventEmitterAccessors.length).toEqual(1);

        var accessor = inj.eventEmitterAccessors[0][0];
        expect(accessor.eventName).toEqual('publicEmitter');
        expect(accessor.getter(new HasEventEmitter())).toEqual('emitter');
      });
    });

    describe(".create", () => {
      it("should collect bindings from all directives", () => {
        var pei = createPei(null, 0, [
          DirectiveBinding.createFromType(
              SimpleDirective,
              new ComponentMetadata({bindings: [bind('injectable1').toValue('injectable1')]})),
          DirectiveBinding.createFromType(SomeOtherDirective, new ComponentMetadata({
            bindings: [bind('injectable2').toValue('injectable2')]
          }))
        ]);

        expect(pei.getBindingAtIndex(0).key.token).toBe(SimpleDirective);
        expect(pei.getBindingAtIndex(1).key.token).toBe(SomeOtherDirective);
        expect(pei.getBindingAtIndex(2).key.token).toEqual("injectable1");
        expect(pei.getBindingAtIndex(3).key.token).toEqual("injectable2");
      });

      it("should collect view bindings from the component", () => {
        var pei = createPei(null, 0,
                            [DirectiveBinding.createFromType(SimpleDirective, new ComponentMetadata({
                              viewBindings: [bind('injectable1').toValue('injectable1')]
                            }))],
                            0, true);

        expect(pei.getBindingAtIndex(0).key.token).toBe(SimpleDirective);
        expect(pei.getBindingAtIndex(1).key.token).toEqual("injectable1");
      });

      it("should flatten nested arrays", () => {
        var pei = createPei(null, 0, [
          DirectiveBinding.createFromType(
              SimpleDirective,
              new ComponentMetadata({
                viewBindings: [[[bind('view').toValue('view')]]],
                bindings: [[[bind('host').toValue('host')]]]
              }))
        ], 0, true);

        expect(pei.getBindingAtIndex(0).key.token).toBe(SimpleDirective);
        expect(pei.getBindingAtIndex(1).key.token).toEqual("view");
        expect(pei.getBindingAtIndex(2).key.token).toEqual("host");
      });

      it('should support an arbitrary number of bindings', () => {
        var pei = createPei(null, 0, dynamicBindings);

        for (var i = 0; i < dynamicBindings.length; i++) {
          expect(pei.getBindingAtIndex(i).key.token).toBe(i);
        }
      });
    });
  });

  describe("ElementInjector", () => {
    describe("instantiate", () => {
      it("should create an element injector", () => {
        var protoParent = createPei(null, 0, []);
        var protoChild1 = createPei(protoParent, 1, []);
        var protoChild2 = createPei(protoParent, 2, []);

        var p = protoParent.instantiate(null);
        var c1 = protoChild1.instantiate(p);
        var c2 = protoChild2.instantiate(p);

        expect(c1.parent).toEqual(p);
        expect(c2.parent).toEqual(p);
        expect(isBlank(p.parent)).toBeTruthy();
      });

      describe("direct parent", () => {
        it("should return parent injector when distance is 1", () => {
          var distance = 1;
          var protoParent = createPei(null, 0, []);
          var protoChild = createPei(protoParent, 1, [], distance);

          var p = protoParent.instantiate(null);
          var c = protoChild.instantiate(p);

          expect(c.directParent()).toEqual(p);
        });

        it("should return null otherwise", () => {
          var distance = 2;
          var protoParent = createPei(null, 0, []);
          var protoChild = createPei(protoParent, 1, [], distance);

          var p = protoParent.instantiate(null);
          var c = protoChild.instantiate(p);

          expect(c.directParent()).toEqual(null);
        });
      });
    });

    describe("hasBindings", () => {
      it("should be true when there are bindings", () => {
        var p = createPei(null, 0, [SimpleDirective]);
        expect(p.hasBindings).toBeTruthy();
      });

      it("should be false otherwise", () => {
        var p = createPei(null, 0, []);
        expect(p.hasBindings).toBeFalsy();
      });
    });

    describe("hasInstances", () => {
      it("should be false when no directives are instantiated",
         () => { expect(injector([]).hasInstances()).toBe(false); });

      it("should be true when directives are instantiated",
         () => { expect(injector([SimpleDirective]).hasInstances()).toBe(true); });
    });

    [{ strategy: 'inline', bindings: [] }, { strategy: 'dynamic',
      bindings: dynamicBindings }].forEach((context) => {

      var extraBindings = context['bindings'];
      describe(`${context['strategy']} strategy`, () => {

        describe("hydrate", () => {
          it("should instantiate directives that have no dependencies", () => {
            var bindings = ListWrapper.concat([SimpleDirective], extraBindings);
            var inj = injector(bindings);
            expect(inj.get(SimpleDirective)).toBeAnInstanceOf(SimpleDirective);
          });

          it("should instantiate directives that depend on an arbitrary number of directives", () => {
            var bindings = ListWrapper.concat([SimpleDirective, NeedsDirective], extraBindings);
            var inj = injector(bindings);

            var d = inj.get(NeedsDirective);

            expect(d).toBeAnInstanceOf(NeedsDirective);
            expect(d.dependency).toBeAnInstanceOf(SimpleDirective);
          });

          it("should instantiate bindings that have dependencies with set visibility",
             function() {
               var childInj = parentChildInjectors(
                   ListWrapper.concat(
                       [DirectiveBinding.createFromType(SimpleDirective, new ComponentMetadata({
                         bindings: [bind('injectable1').toValue('injectable1')]
                       }))],
                       extraBindings),
                   [DirectiveBinding.createFromType(SimpleDirective, new ComponentMetadata({
                     bindings: [
                       bind('injectable1')
                           .toValue('new-injectable1'),
                       bind('injectable2')
                           .toFactory(
                               (val) => `${val}-injectable2`,
                               [[new InjectMetadata('injectable1'), new SkipSelfMetadata()]])
                     ]
                   }))]);
               expect(childInj.get('injectable2')).toEqual('injectable1-injectable2');
             });

          it("should instantiate bindings that have dependencies", () => {
            var bindings = [
                    bind('injectable1')
                        .toValue('injectable1'),
                    bind('injectable2')
                        .toFactory(
                            (val) => `${val}-injectable2`,
                            ['injectable1'])
                  ];

            var inj = injector(ListWrapper.concat(
                [DirectiveBinding.createFromType(SimpleDirective,
                  new DirectiveMetadata({bindings: bindings}))],
                extraBindings));

            expect(inj.get('injectable2')).toEqual('injectable1-injectable2');
          });

          it("should instantiate viewBindings that have dependencies", () => {
            var viewBindings = [
                    bind('injectable1')
                        .toValue('injectable1'),
                    bind('injectable2')
                        .toFactory(
                            (val) => `${val}-injectable2`,
                            ['injectable1'])
                  ];


            var inj = injector(ListWrapper.concat(
                [DirectiveBinding.createFromType(SimpleDirective, new ComponentMetadata({
                  viewBindings: viewBindings}))], extraBindings),
                null, true);
            expect(inj.get('injectable2')).toEqual('injectable1-injectable2');
          });

          it("should instantiate components that depend on viewBindings bindings", () => {
            var inj = injector(
                ListWrapper.concat([DirectiveBinding.createFromType(NeedsService, new ComponentMetadata({
                                     viewBindings: [bind('service').toValue('service')]
                                   }))],
                                   extraBindings),
                null, true);
            expect(inj.get(NeedsService).service).toEqual('service');
          });

          it("should instantiate bindings lazily", () => {
            var created = false;
            var inj = injector(
                ListWrapper.concat([DirectiveBinding.createFromType(SimpleDirective, new ComponentMetadata({
                                     bindings: [bind('service').toFactory(() => created = true)]
                                   }))],
                                   extraBindings),
                null, true);

            expect(created).toBe(false);

            inj.get('service');

            expect(created).toBe(true);
          });

          it("should instantiate view bindings lazily", () => {
            var created = false;
            var inj = injector(
                ListWrapper.concat([DirectiveBinding.createFromType(SimpleDirective, new ComponentMetadata({
                                     viewBindings: [bind('service').toFactory(() => created = true)]
                                   }))],
                                   extraBindings),
                null, true);

            expect(created).toBe(false);

            inj.get('service');

            expect(created).toBe(true);
          });

          it("should not instantiate other directives that depend on viewBindings bindings",
             () => {
               var directiveAnnotation = new ComponentMetadata({
                 viewBindings: ListWrapper.concat([bind("service").toValue("service")], extraBindings)
               });
               var componentDirective =
                   DirectiveBinding.createFromType(SimpleDirective, directiveAnnotation);
               expect(() => { injector([componentDirective, NeedsService], null); })
                   .toThrowError(containsRegexp(
                       `No provider for service! (${stringify(NeedsService) } -> service)`));
             });

          it("should instantiate directives that depend on bindings of other directives", () => {
            var shadowInj = hostShadowInjectors(
                ListWrapper.concat([DirectiveBinding.createFromType(SimpleDirective, new ComponentMetadata({
                      bindings: [bind('service').toValue('hostService')]})
                    )], extraBindings),
                ListWrapper.concat([NeedsService], extraBindings)
            );
            expect(shadowInj.get(NeedsService).service).toEqual('hostService');
          });

          it("should instantiate directives that depend on imperatively created injector bindings (bootstrap)", () => {
            var imperativelyCreatedInjector = Injector.resolveAndCreate([
              bind("service").toValue('appService')
            ]);
            var inj = injector([NeedsService], imperativelyCreatedInjector);
            expect(inj.get(NeedsService).service).toEqual('appService');

            expect(() => injector([NeedsServiceFromHost], imperativelyCreatedInjector)).toThrowError();
          });

          it("should instantiate directives that depend on imperatively created injector bindings (root injector)", () => {
            var imperativelyCreatedInjector = Injector.resolveAndCreate([
              bind("service").toValue('appService')
            ]);
            var inj = hostShadowInjectors([SimpleDirective], [NeedsService, NeedsServiceFromHost], imperativelyCreatedInjector);
            expect(inj.get(NeedsService).service).toEqual('appService');
            expect(inj.get(NeedsServiceFromHost).service).toEqual('appService');
          });

          it("should instantiate directives that depend on imperatively created injector bindings (child injector)", () => {
            var imperativelyCreatedInjector = Injector.resolveAndCreate([
              bind("service").toValue('appService')
            ]);
            var inj = parentChildInjectors([], [NeedsService, NeedsServiceFromHost], null, imperativelyCreatedInjector);
            expect(inj.get(NeedsService).service).toEqual('appService');
            expect(inj.get(NeedsServiceFromHost).service).toEqual('appService');
          });

          it("should prioritize viewBindings over bindings for the same binding", () => {
            var inj = injector(
                ListWrapper.concat([DirectiveBinding.createFromType(NeedsService, new ComponentMetadata({
                      bindings: [bind('service').toValue('hostService')],
                      viewBindings: [bind('service').toValue('viewService')]})
                    )], extraBindings), null, true);
            expect(inj.get(NeedsService).service).toEqual('viewService');
          });

          it("should prioritize directive bindings over component bindings", () => {
            var component = DirectiveBinding.createFromType(NeedsService, new ComponentMetadata({
                      bindings: [bind('service').toValue('compService')]}));
            var directive = DirectiveBinding.createFromType(SomeOtherDirective, new DirectiveMetadata({
                      bindings: [bind('service').toValue('dirService')]}));
            var inj = injector(ListWrapper.concat([component, directive], extraBindings), null, true);
            expect(inj.get(NeedsService).service).toEqual('dirService');
          });

          it("should not instantiate a directive in a view that has a host dependency on bindings"+
            " of the component", () => {
            expect(() => {
              hostShadowInjectors(
                ListWrapper.concat([
                  DirectiveBinding.createFromType(SomeOtherDirective, new DirectiveMetadata({
                      bindings: [bind('service').toValue('hostService')]})
                  )], extraBindings),
                ListWrapper.concat([NeedsServiceFromHost], extraBindings)
              );
            }).toThrowError(new RegExp("No provider for service!"));
          });

          it("should not instantiate a directive in a view that has a host dependency on bindings"+
            " of a decorator directive", () => {
            expect(() => {
              hostShadowInjectors(
                ListWrapper.concat([
                  SimpleDirective,
                  DirectiveBinding.createFromType(SomeOtherDirective, new DirectiveMetadata({
                      bindings: [bind('service').toValue('hostService')]})
                  )], extraBindings),

                ListWrapper.concat([NeedsServiceFromHost], extraBindings)
              );
            }).toThrowError(new RegExp("No provider for service!"));
          });

          it("should instantiate directives that depend on pre built objects", () => {
            var templateRef = new TemplateRef(<any>new SpyElementRef());
            var bindings = ListWrapper.concat([NeedsTemplateRef], extraBindings);
            var inj = injector(bindings, null, false, new PreBuiltObjects(null, null, null, templateRef));

            expect(inj.get(NeedsTemplateRef).templateRef).toEqual(templateRef);
          });

          it("should get directives", () => {
            var child = hostShadowInjectors(
                ListWrapper.concat([SomeOtherDirective, SimpleDirective], extraBindings),
                [NeedsDirectiveFromHostShadowDom]);

            var d = child.get(NeedsDirectiveFromHostShadowDom);

            expect(d).toBeAnInstanceOf(NeedsDirectiveFromHostShadowDom);
            expect(d.dependency).toBeAnInstanceOf(SimpleDirective);
          });

          it("should get directives from the host", () => {
            var child = parentChildInjectors(ListWrapper.concat([SimpleDirective], extraBindings),
                                             [NeeedsDirectiveFromHost]);

            var d = child.get(NeeedsDirectiveFromHost);

            expect(d).toBeAnInstanceOf(NeeedsDirectiveFromHost);
            expect(d.dependency).toBeAnInstanceOf(SimpleDirective);
          });

          it("should throw when a dependency cannot be resolved", () => {
            expect(() => injector(ListWrapper.concat([NeeedsDirectiveFromHost], extraBindings)))
                .toThrowError(containsRegexp(
                    `No provider for ${stringify(SimpleDirective) }! (${stringify(NeeedsDirectiveFromHost) } -> ${stringify(SimpleDirective) })`));
          });

          it("should inject null when an optional dependency cannot be resolved", () => {
            var inj = injector(ListWrapper.concat([OptionallyNeedsDirective], extraBindings));
            var d = inj.get(OptionallyNeedsDirective);
            expect(d.dependency).toEqual(null);
          });

          it("should accept bindings instead of types", () => {
            var inj = injector(
                ListWrapper.concat([bind(SimpleDirective).toClass(SimpleDirective)], extraBindings));
            expect(inj.get(SimpleDirective)).toBeAnInstanceOf(SimpleDirective);
          });

          it("should allow for direct access using getDirectiveAtIndex", () => {
            var bindings =
                ListWrapper.concat([bind(SimpleDirective).toClass(SimpleDirective)], extraBindings);

            var inj = injector(bindings);

            var firsIndexOut = bindings.length > 10 ? bindings.length : 10;

            expect(inj.getDirectiveAtIndex(0)).toBeAnInstanceOf(SimpleDirective);
            expect(() => inj.getDirectiveAtIndex(-1)).toThrowError('Index -1 is out-of-bounds.');
            expect(() => inj.getDirectiveAtIndex(firsIndexOut))
                .toThrowError(`Index ${firsIndexOut} is out-of-bounds.`);
          });

          it("should instantiate directives that depend on the containing component", () => {
            var directiveBinding =
                DirectiveBinding.createFromType(SimpleDirective, new ComponentMetadata());
            var shadow = hostShadowInjectors(ListWrapper.concat([directiveBinding], extraBindings),
                                             [NeeedsDirectiveFromHost]);

            var d = shadow.get(NeeedsDirectiveFromHost);
            expect(d).toBeAnInstanceOf(NeeedsDirectiveFromHost);
            expect(d.dependency).toBeAnInstanceOf(SimpleDirective);
          });

          it("should not instantiate directives that depend on other directives in the containing component's ElementInjector",
             () => {
               var directiveBinding =
                   DirectiveBinding.createFromType(SomeOtherDirective, new ComponentMetadata());
               expect(() =>
                      {
                        hostShadowInjectors(
                            ListWrapper.concat([directiveBinding, SimpleDirective], extraBindings),
                            [NeedsDirective]);
                      })
                   .toThrowError(containsRegexp(
                       `No provider for ${stringify(SimpleDirective) }! (${stringify(NeedsDirective) } -> ${stringify(SimpleDirective) })`));
             });
        });

        describe("getRootViewInjectors", () => {
          it("should return an empty array if there is no nested view", () => {
            var inj = injector(extraBindings);
            expect(inj.getRootViewInjectors()).toEqual([]);
          });

          it("should return an empty array on a dehydrated view", () => {
            var inj = injector(extraBindings);
            inj.dehydrate();
            expect(inj.getRootViewInjectors()).toEqual([]);
          });
        });

        describe("dehydrate", () => {
          function cycleHydrate(inj: ElementInjector, host=null): void {
            // Each injection supports 3 query slots, so we cycle 4 times.
            for (var i = 0; i < 4; i++) {
              inj.dehydrate();
              inj.hydrate(null, host, defaultPreBuiltObjects);
            }
          }

          it("should handle repeated hydration / dehydration", () => {
            var inj = injector(extraBindings);
            cycleHydrate(inj);
          });

          it("should handle repeated hydration / dehydration with query present", () => {
            var inj = injector(ListWrapper.concat([NeedsQuery], extraBindings));
            cycleHydrate(inj);
          });


          it("should handle repeated hydration / dehydration with view query present", () => {
            var inj = injector(extraBindings);
            var host = injector(ListWrapper.concat([NeedsViewQuery], extraBindings));

            cycleHydrate(inj, host);
          });
        });

        describe("lifecycle", () => {
          it("should call onDestroy on directives subscribed to this event", () => {
            var inj = injector(ListWrapper.concat(
                [DirectiveBinding.createFromType(DirectiveWithDestroy,
                                                 new DirectiveMetadata())],
                extraBindings));
            var destroy = inj.get(DirectiveWithDestroy);
            inj.dehydrate();
            expect(destroy.onDestroyCounter).toBe(1);
          });

          it("should work with services", () => {
            var inj = injector(ListWrapper.concat(
                [DirectiveBinding.createFromType(
                    SimpleDirective, new DirectiveMetadata({bindings: [SimpleService]}))],
                extraBindings));
            inj.dehydrate();
          });
        });

        describe('static attributes', () => {
          it('should be injectable', () => {
            var attributes = new Map();
            attributes.set( 'type', 'text');
            attributes.set( 'title', '');

            var inj = injector(ListWrapper.concat([NeedsAttribute], extraBindings), null, false, null,
                               attributes);
            var needsAttribute = inj.get(NeedsAttribute);

            expect(needsAttribute.typeAttribute).toEqual('text');
            expect(needsAttribute.titleAttribute).toEqual('');
            expect(needsAttribute.fooAttribute).toEqual(null);
          });

          it('should be injectable without type annotation', () => {
            var attributes = new Map();
            attributes.set( 'foo', 'bar');

            var inj = injector(ListWrapper.concat([NeedsAttributeNoType], extraBindings), null, false,
                               null, attributes);
            var needsAttribute = inj.get(NeedsAttributeNoType);

            expect(needsAttribute.fooAttribute).toEqual('bar');
          });
        });

        describe("refs", () => {
          it("should inject ElementRef", () => {
            var inj = injector(ListWrapper.concat([NeedsElementRef], extraBindings));
            expect(inj.get(NeedsElementRef).elementRef).toBe(defaultPreBuiltObjects.elementRef);
          });

          it("should inject ChangeDetectorRef of the component's view into the component", () => {
            var cd = new DynamicChangeDetector(null, null, 0, [], [], null, [], [], [], null);
            var view = <any>createDummyView();
            var childView = createDummyView(cd);
            view.spy('getNestedView').andReturn(childView);
            var binding = DirectiveBinding.createFromType(ComponentNeedsChangeDetectorRef, new ComponentMetadata());
            var inj = injector(ListWrapper.concat([binding], extraBindings), null, true,
                               new PreBuiltObjects(null, view, <any>new SpyElementRef(), null));

            expect(inj.get(ComponentNeedsChangeDetectorRef).changeDetectorRef).toBe(cd.ref);
          });

          it("should inject ChangeDetectorRef of the containing component into directives", () => {
            var cd = new DynamicChangeDetector(null, null, 0, [], [], null, [], [], [], null);
            var view = createDummyView(cd);
            var binding = DirectiveBinding.createFromType(DirectiveNeedsChangeDetectorRef, new DirectiveMetadata());
            var inj = injector(ListWrapper.concat([binding], extraBindings), null, false,
                               new PreBuiltObjects(null, view, <any>new SpyElementRef(), null));

            expect(inj.get(DirectiveNeedsChangeDetectorRef).changeDetectorRef).toBe(cd.ref);
          });

          it('should inject ViewContainerRef', () => {
            var inj = injector(ListWrapper.concat([NeedsViewContainer], extraBindings));
            expect(inj.get(NeedsViewContainer).viewContainer).toBeAnInstanceOf(ViewContainerRef);
          });

          it("should inject TemplateRef", () => {
            var templateRef = new TemplateRef(<any>new SpyElementRef());
            var inj = injector(ListWrapper.concat([NeedsTemplateRef], extraBindings), null, false,
                               new PreBuiltObjects(null, null, null, templateRef));

            expect(inj.get(NeedsTemplateRef).templateRef).toEqual(templateRef);
          });

          it("should throw if there is no TemplateRef", () => {
            expect(() => injector(ListWrapper.concat([NeedsTemplateRef], extraBindings)))
                .toThrowError(
                    `No provider for TemplateRef! (${stringify(NeedsTemplateRef) } -> TemplateRef)`);
          });

          it('should inject null if there is no TemplateRef when the dependency is optional', () => {
            var inj = injector(ListWrapper.concat([OptionallyInjectsTemplateRef], extraBindings));
            var instance = inj.get(OptionallyInjectsTemplateRef);
            expect(instance.templateRef).toBeNull();
          });
        });

        describe('queries', () => {
          var dummyView;
          var preBuildObjects;

          beforeEach(() => { _constructionCount = 0;
            dummyView = createDummyView();
            preBuildObjects = new PreBuiltObjects(null, dummyView, <any>new SpyElementRef(), null);
          });

          function expectDirectives(query: QueryList<any>, type, expectedIndex) {
            var currentCount = 0;
            expect(query.length).toEqual(expectedIndex.length);
            iterateListLike(query, (i) => {
              expect(i).toBeAnInstanceOf(type);
              expect(i.count).toBe(expectedIndex[currentCount]);
              currentCount += 1;
            });
          }

          it('should be injectable', () => {
            var inj =
                injector(ListWrapper.concat([NeedsQuery], extraBindings), null, false, preBuildObjects);
            expect(inj.get(NeedsQuery).query).toBeAnInstanceOf(QueryList);
          });

          it('should contain directives on the same injector', () => {
            var inj = injector(ListWrapper.concat([
                NeedsQuery,
                CountingDirective
              ], extraBindings), null,
              false, preBuildObjects);

            addInj(dummyView, inj);
            inj.afterContentChecked();

            expectDirectives(inj.get(NeedsQuery).query, CountingDirective, [0]);
          });

          it('should contain PreBuiltObjects on the same injector', () => {
            var preBuiltObjects = new PreBuiltObjects(null, dummyView, null, new TemplateRef(<any>new SpyElementRef()));
            var inj = injector(ListWrapper.concat([
                NeedsTemplateRefQuery
              ], extraBindings), null,
              false, preBuiltObjects);
            addInj(dummyView, inj);

            inj.afterContentChecked();

            expect(inj.get(NeedsTemplateRefQuery).query.first).toBe(preBuiltObjects.templateRef);
          });

          it('should contain the element when no directives are bound to the var binding', () => {
            var dirs = [NeedsQueryByVarBindings];

            var dirVariableBindings = MapWrapper.createFromStringMap({
              "one": null // element
            });

            var inj = injector(dirs.concat(extraBindings), null,
                               false, preBuildObjects, null, dirVariableBindings);

            addInj(dummyView, inj);
            inj.afterContentChecked();

            expect(inj.get(NeedsQueryByVarBindings).query.first).toBe(preBuildObjects.elementRef);
          });

          it('should contain directives on the same injector when querying by variable bindings' +
            'in the order of var bindings specified in the query', () => {
            var dirs = [NeedsQueryByVarBindings, NeedsDirective, SimpleDirective];

            var dirVariableBindings = MapWrapper.createFromStringMap({
              "one": 2, // 2 is the index of SimpleDirective
              "two": 1 // 1 is the index of NeedsDirective
            });

            var inj = injector(dirs.concat(extraBindings), null,
                               false, preBuildObjects, null, dirVariableBindings);

            addInj(dummyView, inj);
            inj.afterContentChecked();

            // NeedsQueryByVarBindings queries "one,two", so SimpleDirective should be before NeedsDirective
            expect(inj.get(NeedsQueryByVarBindings).query.first).toBeAnInstanceOf(SimpleDirective);
            expect(inj.get(NeedsQueryByVarBindings).query.last).toBeAnInstanceOf(NeedsDirective);
          });

          it('should contain directives on the same and a child injector in construction order', () => {
            var protoParent = createPei(null, 0, [NeedsQuery, CountingDirective]);
            var protoChild =
                createPei(protoParent, 1, ListWrapper.concat([CountingDirective], extraBindings));

            var parent = protoParent.instantiate(null);
            var child = protoChild.instantiate(parent);
            parent.hydrate(null, null, preBuildObjects);
            child.hydrate(null, null, preBuildObjects);

            addInj(dummyView, parent);
            addInj(dummyView, child);
            parent.afterContentChecked();

            expectDirectives(parent.get(NeedsQuery).query, CountingDirective, [0, 1]);
          });
        });
      });
    });
  });
}

class ContextWithHandler {
  handler;
  constructor(handler) { this.handler = handler; }
}
