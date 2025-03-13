import React from 'react';
import { ButtonGroup, Button } from 'react-bootstrap';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from '../hooks/useTranslation';

const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <ButtonGroup size="sm">
      <Button
        variant={language === 'en' ? 'primary' : 'outline-primary'}
        onClick={() => setLanguage('en')}
      >
        {t('languages.en')}
      </Button>
      <Button
        variant={language === 'th' ? 'primary' : 'outline-primary'}
        onClick={() => setLanguage('th')}
      >
        {t('languages.th')}
      </Button>
    </ButtonGroup>
  );
};

export default LanguageSelector;