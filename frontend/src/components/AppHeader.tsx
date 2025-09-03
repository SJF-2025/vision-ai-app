'use client';

import { Header, HeaderName, HeaderGlobalBar } from '@carbon/react';

export default function AppHeader() {
  return (
    <Header aria-label="VisionAI">
      <HeaderName prefix="IBM">Vision AI App</HeaderName>
      <HeaderGlobalBar />
    </Header>
  );
}


