import { ParserTreeSelect } from '@/components/parser-tree-select';
import { ButtonLoading } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ParseType } from '@/constants/knowledge';
import { buildParserSelectValue } from '@/hooks/use-parser-options';
import { useParserSelectHandler } from '@/hooks/use-parser-select-handler';
import { useFetchDefaultModelDictionary } from '@/hooks/use-llm-request';
import { IModalProps } from '@/interfaces/common';
import { zodResolver } from '@hookform/resolvers/zod';
import { omit } from 'lodash';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { EmbeddingModelItem } from '../dataset/setting/common-item';
import styles from './dataset-creating-dialog.module.css';

const FormId = 'dataset-creating-form';

export function InputForm({ onOk }: IModalProps<any>) {
  const { t } = useTranslation();
  const defaultModelDictionary = useFetchDefaultModelDictionary(true);

  const FormSchema = z
    .object({
      name: z
        .string()
        .min(1, {
          message: t('knowledgeList.namePlaceholder'),
        })
        .trim(),
      parse_type: z.nativeEnum(ParseType).optional(),
      embedding_model: z
        .string()
        .min(1, {
          message: t('knowledgeConfiguration.embeddingModelPlaceholder'),
        })
        .trim(),
      parser_id: z.string().optional(),
      pipeline_id: z.string().optional(),
      pipeline_version_id: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      // When parse_type === BuiltIn, parser_id is required
      if (data.parse_type === ParseType.BuiltIn && !data.parser_id?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('knowledgeList.parserRequired'),
          path: ['parser_id'],
        });
      }
      // When parse_type === Pipeline, pipeline_id required
      if (data.parse_type === ParseType.Pipeline && !data.pipeline_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('knowledgeList.dataFlowRequired'),
          path: ['pipeline_id'],
        });
      }
    });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
      parse_type: ParseType.BuiltIn,
      parser_id: 'general',
      pipeline_id: '',
      pipeline_version_id: '',
      embedding_model: defaultModelDictionary?.embd_id,
    },
  });

  const parseType = useWatch({
    control: form.control,
    name: 'parse_type',
  });
  const parserId = useWatch({
    control: form.control,
    name: 'parser_id',
  });
  const pipelineId = useWatch({
    control: form.control,
    name: 'pipeline_id',
  });
  const pipelineVersionId = useWatch({
    control: form.control,
    name: 'pipeline_version_id',
  });

  const handleParserSelect = useParserSelectHandler(form);

  function onSubmit(data: z.infer<typeof FormSchema>) {
    const nextData =
      parseType === ParseType.BuiltIn
        ? omit(data, ['pipeline_id', 'pipeline_version_id'])
        : omit(data, ['parser_id']);
    onOk?.(nextData);
  }

  // Backfill the default embedding model once the async query resolves, but
  // never overwrite a model the user has already picked.
  useEffect(() => {
    if (defaultModelDictionary?.embd_id && !form.getValues('embedding_model')) {
      form.setValue('embedding_model', defaultModelDictionary.embd_id);
    }
  }, [defaultModelDictionary, form]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.warn(errors);
        })}
        className="space-y-6"
        id={FormId}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel required>{t('knowledgeList.name')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('knowledgeList.namePlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <EmbeddingModelItem line={2} isEdit={false} />
        <FormField
          control={form.control}
          name={parseType === ParseType.BuiltIn ? 'parser_id' : 'pipeline_id'}
          render={() => (
            <FormItem>
              <FormLabel>{t('knowledgeList.cardParser')}</FormLabel>
              <ParserTreeSelect
                value={buildParserSelectValue({
                  parseType,
                  parserId,
                  pipelineId,
                  pipelineVersionId,
                })}
                onChange={handleParserSelect}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

export function DatasetCreatingDialog({
  hideModal,
  onOk,
  loading,
}: IModalProps<any>) {
  const { t } = useTranslation();

  return (
    <Dialog open onOpenChange={hideModal}>
      <DialogContent
        className={`${styles.dialog} max-w-[calc(100vw-2rem)] sm:max-w-[425px] focus-visible:!outline-none flex flex-col rounded-2xl sm:rounded-2xl`}
        data-testid="dataset-creating-dialog"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            const form = document.getElementById(FormId) as HTMLFormElement;
            form?.requestSubmit();
          }
        }}
      >
        <DialogHeader className="rounded-t-2xl bg-nav-active-bg/40 border-nav-active-text/15">
          <DialogTitle className={styles.title}>
            {t('knowledgeList.createKnowledgeBase')}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          {t('knowledgeList.createKnowledgeBase')}
        </DialogDescription>
        <InputForm onOk={onOk}></InputForm>
        <DialogFooter className="border-t border-nav-active-text/15 pt-4">
          <ButtonLoading
            data-creation-action
            type="submit"
            form={FormId}
            loading={loading}
            className="min-w-[120px] rounded-md focus-visible:ring-2 focus-visible:ring-nav-active-text focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
          >
            {t('common.save')}
          </ButtonLoading>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
