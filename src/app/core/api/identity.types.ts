declare const entityIdBrand: unique symbol;

type EntityId<Namespace extends string> = number & { readonly [entityIdBrand]: Namespace };

export type PessoaId = EntityId<'PessoaID'>;
export type FilialId = EntityId<'FilialID'>;
export type EsusId = EntityId<'EsusID'>;
export type PrestadorId = EntityId<'PrestadorID'>;
export type PrestadorIdentidadeId = EntityId<'PrestadorIdentidadeID'>;
