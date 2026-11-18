import { formatBuiltinFieldText } from '../builtin-field-label';

describe('formatBuiltinFieldText', () => {
  test('appends the Chinese translation for builtin field names and descriptions', () => {
    expect(formatBuiltinFieldText('person', 'zh')).toBe('person (人物)');
    expect(
      formatBuiltinFieldText('A natural person (individual human).', 'zh-CN'),
    ).toBe('A natural person (individual human). (自然人（个人）。)');
    expect(
      formatBuiltinFieldText(
        'Mereological relation — component to whole.',
        'zh',
      ),
    ).toBe(
      'Mereological relation — component to whole. (部分与整体的组成关系。)',
    );
  });

  test('keeps custom text and non-Chinese locales unchanged', () => {
    expect(formatBuiltinFieldText('custom_type', 'zh')).toBe('custom_type');
    expect(formatBuiltinFieldText('person', 'en')).toBe('person');
    expect(formatBuiltinFieldText(undefined, 'zh')).toBeUndefined();
  });
});
