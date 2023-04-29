import { ModelAdapter } from '@src/adapters/adapter.interface';
import { merge } from 'lodash';
import type { PartialDeep } from 'type-fest';
import { Association } from './association';
import {
  Associator,
  Builder,
  BuilderMany,
  DefaultAttributesFactory,
} from './interfaces';
import { Dictionary } from './types';

export class Factory<T extends Dictionary, P extends Dictionary, ReturnType = T>
  implements
    Builder<T, P, ReturnType>,
    Associator<T, P, ReturnType>,
    BuilderMany<T, P, ReturnType>
{
  constructor(
    private readonly defaultAttributesFactory: DefaultAttributesFactory<T, P>,
    private readonly model: ReturnType,
    private readonly adapter: ModelAdapter<ReturnType>,
  ) {}

  associate<K extends keyof ReturnType>(
    key?: K | undefined,
  ): Association<T, P, ReturnType> {
    return new Association<T, P, ReturnType>(this, this.adapter, key);
  }

  build(override?: PartialDeep<T>, additionalParams?: P): ReturnType {
    const attributesWithAssociations =
      this.resolveAssociations(additionalParams);

    const mergedAttributes = merge(attributesWithAssociations, override);

    const finalResult = this.adapter.set(
      this.model,
      mergedAttributes as PartialDeep<ReturnType>,
    );

    return finalResult;
  }

  buildMany(
    count: number,
    partials?: PartialDeep<T>[] | PartialDeep<T>,
    additionalParams?: P,
  ): ReturnType[] {
    if (Array.isArray(partials)) {
      return Array.from({ length: count }).map((_, index: number) =>
        this.build(partials?.[index], additionalParams),
      );
    }

    return Array.from({ length: count }).map(() =>
      this.build(partials, additionalParams),
    );
  }

  private resolveAssociations(additionalParams?: P): T {
    const attributes = this.defaultAttributesFactory({
      transientParams: additionalParams,
    });
    const defaultWithAssociations: Dictionary = {};

    for (const prop in attributes) {
      const value = attributes[prop];
      if (isAssociation(value)) {
        defaultWithAssociations[prop] = value.build();
      } else {
        defaultWithAssociations[prop] = value;
      }
    }

    return defaultWithAssociations as T;
  }
}

function isAssociation<T>(value: T | Association<T>): value is Association<T> {
  return value instanceof Association;
}
