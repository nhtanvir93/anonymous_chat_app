import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { GetMessagesDto } from './dto/get-messages.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import type { Request } from 'express';

@Controller('rooms/:id/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  async getMessages(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() dto: GetMessagesDto,
  ) {
    const result = await this.messagesService.getMessages(id, dto);

    return {
      success: true,
      data: result,
    };
  }

  @Post()
  async create(
    @Body() dto: CreateMessageDto,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ) {
    const message = await this.messagesService.createMessage(
      id,
      request.userId!,
      dto,
    );

    return {
      success: true,
      data: message,
    };
  }
}
