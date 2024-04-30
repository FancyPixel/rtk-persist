import { ActionReducerMapBuilder, CaseReducer, Action } from "@reduxjs/toolkit";

export class Builder<
  SliceState,
  PersistedSliceState extends SliceState & {
    sliceStorageLastUpdateAt?: number;
  },
> implements ActionReducerMapBuilder<PersistedSliceState>
{
  name: string;
  builder: ActionReducerMapBuilder<PersistedSliceState>;
  constructor(
    name: string,
    builder: ActionReducerMapBuilder<PersistedSliceState>,
  ) {
    this.name = name;
    this.builder = builder;
  }

  addDefaultCase(r: CaseReducer<PersistedSliceState, Action>) {
    this.builder.addDefaultCase((s, a) => {
      const ns = r(s, a);
      if (ns) {
        ns.sliceStorageLastUpdateAt = new Date().getMilliseconds();
      } else {
        s.sliceStorageLastUpdateAt = new Date().getMilliseconds();
      }
      return ns;
    });
    return this;
  }

  addMatcher(p: any, r: CaseReducer<PersistedSliceState, any>) {
    this.builder.addMatcher(p, (s, a) => {
      const ns = r(s, a);
      if (ns) {
        ns.sliceStorageLastUpdateAt = new Date().getMilliseconds();
      } else {
        s.sliceStorageLastUpdateAt = new Date().getMilliseconds();
      }
      return ns;
    });

    return this;
  }

  addCase(ac: any, r: CaseReducer<PersistedSliceState, any>) {
    this.builder.addCase(ac, (s, a) => {
      const ns = r(s, a);
      if (ns) {
        ns.sliceStorageLastUpdateAt = new Date().getMilliseconds();
      } else {
        s.sliceStorageLastUpdateAt = new Date().getMilliseconds();
      }
      return ns;
    });
    return this;
  }
}